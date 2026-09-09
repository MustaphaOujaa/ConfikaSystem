<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $purposeTitle }}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 30px 10px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" style="max-width: 520px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05); border-top: 5px solid #dc2626;">
                    <tr>
                        <td style="padding: 28px 30px 20px; text-align: center; background-color: #ffffff;">
                            <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #dc2626; letter-spacing: 1px;">CONFIKA SYSTEM</h1>
                            <p style="margin: 6px 0 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Gestion d'inventaire &amp; Caisse</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 35px 30px;">
                            <h2 style="margin: 0 0 14px; font-size: 18px; color: #111827; font-weight: 700;">{{ $purposeTitle }}</h2>
                            <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #4b5563;">
                                {{ $purposeDescription }}
                            </p>
                            <div style="background-color: #fef2f2; border: 2px dashed #dc2626; border-radius: 10px; padding: 18px; text-align: center; margin: 25px 0;">
                                <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; color: #dc2626; letter-spacing: 8px; display: inline-block;">
                                    {{ $otp }}
                                </span>
                            </div>
                            <p style="margin: 0 0 10px; font-size: 13px; color: #6b7280; text-align: center;">
                                Ce code expire dans <strong>15 minutes</strong>.
                            </p>
                            <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.5;">
                                Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet email en toute sécurité.
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #f9fafb; padding: 16px 30px; text-align: center; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
                            &copy; {{ date('Y') }} Confika System. Tous droits réservés.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
