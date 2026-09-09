import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Send,
  Check
} from 'lucide-react';
import { 
  useRequestAdminEmailOtpMutation, 
  useUpdateAdminEmailMutation, 
  useRequestAdminPasswordOtpMutation, 
  useUpdateAdminPasswordMutation 
} from '../api/apiSlice';
import { selectCurrentUser, updateUser } from '../store/authSlice';

export default function SecurityPage() {
  const user = useSelector(selectCurrentUser);
  const dispatch = useDispatch();

  // Email Change State
  const [emailStep, setEmailStep] = useState(1); // 1: input new email, 2: input OTP
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password Change State
  const [pwdStep, setPwdStep] = useState(1); // 1: request OTP, 2: input OTP + new password
  const [pwdOtp, setPwdOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [requestEmailOtp, { isLoading: isSendingEmailOtp }] = useRequestAdminEmailOtpMutation();
  const [updateEmail, { isLoading: isUpdatingEmail }] = useUpdateAdminEmailMutation();
  const [requestPasswordOtp, { isLoading: isSendingPwdOtp }] = useRequestAdminPasswordOtpMutation();
  const [updatePassword, { isLoading: isUpdatingPassword }] = useUpdateAdminPasswordMutation();

  // --- Email Change Handlers ---
  const handleRequestEmailOtp = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    if (newEmail.trim().toLowerCase() === user?.email?.toLowerCase()) {
      setEmailError('La nouvelle adresse email doit être différente de l\'adresse actuelle.');
      return;
    }

    try {
      const res = await requestEmailOtp({ new_email: newEmail }).unwrap();
      setEmailSuccess(res.message || 'Code OTP envoyé à votre nouvelle adresse.');
      setEmailStep(2);
    } catch (err) {
      setEmailError(err?.data?.errors?.new_email?.[0] || err?.data?.message || 'Erreur lors de l\'envoi du code.');
    }
  };

  const handleUpdateEmail = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    try {
      const res = await updateEmail({ new_email: newEmail, otp: emailOtp }).unwrap();
      dispatch(updateUser(res.user));
      setEmailSuccess('Adresse email mise à jour avec succès !');
      setEmailStep(1);
      setNewEmail('');
      setEmailOtp('');
    } catch (err) {
      setEmailError(err?.data?.errors?.otp?.[0] || err?.data?.message || 'Code OTP incorrect ou expiré.');
    }
  };

  // --- Password Change Handlers ---
  const handleRequestPwdOtp = async () => {
    setPwdError('');
    setPwdSuccess('');

    try {
      const res = await requestPasswordOtp().unwrap();
      setPwdSuccess(res.message || 'Code OTP envoyé à votre adresse email actuelle.');
      setPwdStep(2);
    } catch (err) {
      setPwdError(err?.data?.message || 'Erreur lors de l\'envoi du code OTP.');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPwdError('');
    setPwdSuccess('');

    if (newPassword !== confirmPassword) {
      setPwdError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    try {
      await updatePassword({
        otp: pwdOtp,
        password: newPassword,
        password_confirmation: confirmPassword,
      }).unwrap();
      setPwdSuccess('Mot de passe administrateur modifié avec succès !');
      setPwdStep(1);
      setPwdOtp('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwdError(err?.data?.errors?.otp?.[0] || err?.data?.errors?.password?.[0] || err?.data?.message || 'Erreur lors de la modification.');
    }
  };

  return (
    <div style={styles.container}>
      {/* Top Banner */}
      <div style={styles.banner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={styles.bannerIconBox}>
            <ShieldCheck size={28} color="#dc2626" />
          </div>
          <div>
            <h2 style={styles.bannerTitle}>Sécurité & Accès Administrateur</h2>
            <p style={styles.bannerSubtitle}>
              Protégez votre compte et mettez à jour votre email ou mot de passe avec vérification OTP
            </p>
          </div>
        </div>
        <div style={styles.currentBadge}>
          <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>Compte actif :</span>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827', fontFamily: 'monospace' }}>{user?.email}</span>
        </div>
      </div>

      {/* Grid: 2 Main Security Columns */}
      <div style={styles.grid}>
        {/* CARD 1: CHANGE EMAIL */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <div style={styles.iconCircle}>
                <Mail size={20} color="#dc2626" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Modifier l'Adresse Email</h3>
                <p style={styles.cardSubtitle}>
                  Vérification OTP envoyée sur la <strong>nouvelle</strong> adresse
                </p>
              </div>
            </div>
            {emailStep === 2 && (
              <span style={styles.stepBadge}>Étape 2 / 2</span>
            )}
          </div>

          <div style={styles.infoBox}>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
              💡 Si vous avez perdu l'accès à votre ancienne adresse email, saisissez votre <strong>nouvelle adresse email</strong> ci-dessous. Le code OTP de confirmation y sera envoyé directement.
            </p>
          </div>

          {emailError && (
            <div style={styles.errorBanner}>
              <AlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              <span>{emailError}</span>
            </div>
          )}

          {emailSuccess && (
            <div style={styles.successBanner}>
              <CheckCircle2 size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              <span>{emailSuccess}</span>
            </div>
          )}

          {emailStep === 1 ? (
            <form onSubmit={handleRequestEmailOtp} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Nouvelle Adresse Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="ex: nouveau-confikam@gmail.com"
                  required
                  style={styles.input}
                />
              </div>

              <button
                type="submit"
                disabled={isSendingEmailOtp || !newEmail.trim()}
                style={styles.primaryBtn}
              >
                <Send size={16} style={{ marginRight: '8px' }} />
                <span>{isSendingEmailOtp ? 'Envoi en cours...' : 'Envoyer le code OTP à la nouvelle adresse'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdateEmail} style={styles.form}>
              <p style={{ fontSize: '13px', color: '#4b5563', margin: '0 0 10px' }}>
                Un code à 6 chiffres a été envoyé à <strong>{newEmail}</strong>. Saisissez-le pour finaliser le changement :
              </p>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Code OTP reçu (6 chiffres)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={emailOtp}
                  onChange={(e) => setEmailOtp(e.target.value.trim())}
                  placeholder="123456"
                  required
                  style={styles.otpInput}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setEmailStep(1);
                    setEmailError('');
                  }}
                  style={styles.secondaryBtn}
                >
                  <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                  Modifier l'email
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingEmail || emailOtp.length !== 6}
                  style={{ ...styles.primaryBtn, flexGrow: 1 }}
                >
                  <Check size={16} style={{ marginRight: '6px' }} />
                  <span>{isUpdatingEmail ? 'Validation...' : 'Valider le nouvel email'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* CARD 2: CHANGE PASSWORD */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <div style={styles.iconCircle}>
                <Lock size={20} color="#dc2626" />
              </div>
              <div>
                <h3 style={styles.cardTitle}>Modifier le Mot de Passe</h3>
                <p style={styles.cardSubtitle}>
                  Vérification OTP envoyée sur votre email actuel
                </p>
              </div>
            </div>
            {pwdStep === 2 && (
              <span style={styles.stepBadge}>Étape 2 / 2</span>
            )}
          </div>

          <div style={styles.infoBox}>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
              🔒 Pour sécuriser la modification, un code OTP de vérification sera envoyé à votre adresse email actuelle : <strong>{user?.email}</strong>.
            </p>
          </div>

          {pwdError && (
            <div style={styles.errorBanner}>
              <AlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              <span>{pwdError}</span>
            </div>
          )}

          {pwdSuccess && (
            <div style={styles.successBanner}>
              <CheckCircle2 size={16} style={{ marginRight: '8px', flexShrink: 0 }} />
              <span>{pwdSuccess}</span>
            </div>
          )}

          {pwdStep === 1 ? (
            <div style={styles.form}>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                Cliquez sur le bouton ci-dessous pour déclencher l'envoi d'un code OTP à usage unique vers votre boîte de réception.
              </p>
              <button
                type="button"
                onClick={handleRequestPwdOtp}
                disabled={isSendingPwdOtp}
                style={styles.primaryBtn}
              >
                <KeyRound size={16} style={{ marginRight: '8px' }} />
                <span>{isSendingPwdOtp ? 'Envoi du code...' : 'Recevoir le code OTP par email'}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword} style={styles.form}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Code OTP reçu (6 chiffres)</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pwdOtp}
                  onChange={(e) => setPwdOtp(e.target.value.trim())}
                  placeholder="123456"
                  required
                  style={styles.otpInput}
                />
              </div>

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
                  placeholder="Répétez le nouveau mot de passe"
                  required
                  style={styles.input}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setPwdStep(1);
                    setPwdError('');
                  }}
                  style={styles.secondaryBtn}
                >
                  <ArrowLeft size={16} style={{ marginRight: '6px' }} />
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingPassword || pwdOtp.length !== 6}
                  style={{ ...styles.primaryBtn, flexGrow: 1 }}
                >
                  <Check size={16} style={{ marginRight: '6px' }} />
                  <span>{isUpdatingPassword ? 'Mise à jour...' : 'Confirmer le nouveau mot de passe'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    fontFamily: 'Inter, -apple-system, sans-serif',
  },
  banner: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '20px 24px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  bannerIconBox: {
    width: '46px',
    height: '46px',
    borderRadius: '10px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  bannerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  bannerSubtitle: {
    fontSize: '13px',
    color: '#6b7280',
    margin: '4px 0 0',
  },
  currentBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    backgroundColor: '#f9fafb',
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '24px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconCircle: {
    width: '38px',
    height: '38px',
    borderRadius: '8px',
    backgroundColor: '#fef2f2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    margin: 0,
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#6b7280',
    margin: '2px 0 0',
  },
  stepBadge: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '3px 8px',
    borderRadius: '12px',
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '12px 14px',
    marginBottom: '18px',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '18px',
  },
  successBanner: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    fontWeight: '500',
    marginBottom: '18px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
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
    padding: '10px 12px',
    fontSize: '14px',
    borderRadius: '6px',
    border: '1px solid #d1d5db',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  otpInput: {
    padding: '10px 12px',
    fontSize: '22px',
    fontWeight: '700',
    letterSpacing: '8px',
    textAlign: 'center',
    borderRadius: '6px',
    border: '2px dashed #dc2626',
    backgroundColor: '#fff5f5',
    color: '#dc2626',
    outline: 'none',
    boxSizing: 'border-box',
    width: '100%',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 18px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  secondaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '11px 16px',
    backgroundColor: '#f3f4f6',
    color: '#4b5563',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
};
