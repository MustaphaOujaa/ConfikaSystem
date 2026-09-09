import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { 
  useLoginMutation, 
  useForgotPasswordMutation, 
  useVerifyOtpMutation, 
  useResetPasswordMutation 
} from '../api/apiSlice';
import { setCredentials } from '../store/authSlice';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, Lock } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Done
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const [login, { isLoading: isLoggingIn }] = useLoginMutation();
  const [forgotPassword, { isLoading: isSendingOtp }] = useForgotPasswordMutation();
  const [verifyOtp, { isLoading: isVerifyingOtp }] = useVerifyOtpMutation();
  const [resetPassword, { isLoading: isResettingPassword }] = useResetPasswordMutation();

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(setCredentials({ user: result.user, token: result.token }));
      if (result.user?.role === 'admin') {
        navigate('/');
      } else {
        navigate('/pos');
      }
    } catch (err) {
      if (err?.data?.errors?.email) {
        setErrorMessage(err.data.errors.email[0]);
      } else if (err?.data?.message) {
        setErrorMessage(err.data.message);
      } else {
        setErrorMessage('Identifiants incorrects. Veuillez vérifier votre email et mot de passe.');
      }
    }
  };

  // Step 1: Send OTP to email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    try {
      const res = await forgotPassword({ email: forgotEmail }).unwrap();
      setModalSuccess(res.message || 'Code OTP envoyé à votre adresse email.');
      setForgotStep(2);
    } catch (err) {
      setModalError(err?.data?.errors?.email?.[0] || err?.data?.message || 'Erreur lors de l\'envoi du code.');
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');
    try {
      await verifyOtp({ email: forgotEmail, otp: otpCode, type: 'forgot_password' }).unwrap();
      setModalSuccess('Code OTP vérifié ! Vous pouvez définir votre nouveau mot de passe.');
      setForgotStep(3);
    } catch (err) {
      setModalError(err?.data?.errors?.otp?.[0] || err?.data?.message || 'Code OTP invalide.');
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (newPassword !== confirmPassword) {
      setModalError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    try {
      const res = await resetPassword({
        email: forgotEmail,
        otp: otpCode,
        password: newPassword,
        password_confirmation: confirmPassword,
      }).unwrap();
      setModalSuccess(res.message || 'Mot de passe réinitialisé avec succès !');
      setForgotStep(4);
    } catch (err) {
      setModalError(err?.data?.errors?.password?.[0] || err?.data?.message || 'Erreur lors de la réinitialisation.');
    }
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotStep(1);
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setModalError('');
    setModalSuccess('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <img 
            src="/logo.jpeg" 
            alt="Confika System" 
            style={styles.logo}
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          <h2 style={styles.title}>Connexion Système</h2>
          <p style={styles.subtitle}>Saisissez vos identifiants pour accéder à l'application</p>
        </div>

        {errorMessage && (
          <div style={styles.errorBanner}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLoginSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Adresse Email</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ex: confikam@gmail.com"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.inputGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>Mot de passe</label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                style={styles.forgotBtn}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button
            type="submit"
            disabled={isLoggingIn}
            style={styles.button}
          >
            {isLoggingIn ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#dc2626" />
                <h3 style={styles.modalTitle}>Réinitialisation du Mot de Passe</h3>
              </div>
              <button 
                type="button" 
                onClick={closeForgotModal} 
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div style={styles.errorBanner}>
                {modalError}
              </div>
            )}

            {modalSuccess && (
              <div style={styles.successBanner}>
                {modalSuccess}
              </div>
            )}

            {/* Step 1: Request OTP */}
            {forgotStep === 1 && (
              <form onSubmit={handleRequestOtp} style={styles.form}>
                <p style={styles.modalSubtitle}>
                  Entrez votre adresse email enregistrée. Nous vous enverrons un code OTP de vérification à 6 chiffres par email.
                </p>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Votre Email</label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="ex: confikam@gmail.com"
                    required
                    style={styles.input}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSendingOtp}
                  style={styles.button}
                >
                  {isSendingOtp ? 'Envoi du code...' : 'Envoyer le code OTP'}
                </button>
              </form>
            )}

            {/* Step 2: Enter OTP Code */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} style={styles.form}>
                <p style={styles.modalSubtitle}>
                  Un code à 6 chiffres a été envoyé à <strong>{forgotEmail}</strong>. Veuillez le saisir ci-dessous :
                </p>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Code OTP (6 chiffres)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.trim())}
                    placeholder="123456"
                    required
                    style={{ ...styles.input, textAlign: 'center', fontSize: '22px', letterSpacing: '6px', fontWeight: '700' }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    style={styles.secondaryBtn}
                  >
                    <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                    Modifier l'email
                  </button>
                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otpCode.length !== 6}
                    style={{ ...styles.button, flexGrow: 1, marginTop: 0 }}
                  >
                    {isVerifyingOtp ? 'Vérification...' : 'Valider le code'}
                  </button>
                </div>
              </form>
            )}

            {/* Step 3: New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} style={styles.form}>
                <p style={styles.modalSubtitle}>
                  Créez votre nouveau mot de passe sécurisé :
                </p>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Nouveau mot de passe</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Au moins 4 caractères"
                    required
                    style={styles.input}
                  />
                </div>
                <div style={styles.inputGroup}>
                  <label style={styles.label}>Confirmer le mot de passe</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Répétez le mot de passe"
                    required
                    style={styles.input}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  style={styles.button}
                >
                  {isResettingPassword ? 'Réinitialisation...' : 'Enregistrer le nouveau mot de passe'}
                </button>
              </form>
            )}

            {/* Step 4: Done */}
            {forgotStep === 4 && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2 size={48} color="#16a34a" style={{ margin: '0 auto 12px' }} />
                <h4 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>
                  Mot de passe réinitialisé !
                </h4>
                <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 20px' }}>
                  Vous pouvez désormais vous connecter avec vos nouveaux identifiants.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    closeForgotModal();
                    setPassword('');
                  }}
                  style={styles.button}
                >
                  Retour à la connexion
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    padding: '20px',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '36px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    borderTop: '4px solid #dc2626',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logo: {
    maxHeight: '65px',
    marginBottom: '12px',
    objectFit: 'contain',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#111827',
    margin: '0 0 6px 0',
  },
  subtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: 0,
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '20px',
    fontWeight: '500',
  },
  successBanner: {
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #86efac',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    marginBottom: '20px',
    fontWeight: '500',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '10px 14px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  button: {
    marginTop: '6px',
    padding: '12px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  forgotBtn: {
    background: 'none',
    border: 'none',
    color: '#dc2626',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    padding: 0,
    textDecoration: 'underline',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 14px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalCard: {
    width: '100%',
    maxWidth: '440px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    borderTop: '4px solid #dc2626',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  modalSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '0 0 16px',
    lineHeight: '1.5',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#9ca3af',
    cursor: 'pointer',
    padding: '4px',
    lineHeight: 1,
  },
};
