<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $purposeTitle;
    public string $purposeDescription;

    /**
     * Create a new message instance.
     */
    public function __construct(string $otp, string $purposeTitle = 'Vérification de sécurité', string $purposeDescription = 'Voici votre code de vérification à usage unique (OTP) :')
    {
        $this->otp = $otp;
        $this->purposeTitle = $purposeTitle;
        $this->purposeDescription = $purposeDescription;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Confika System - Code de vérification OTP: ' . $this->otp,
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.otp',
            with: [
                'otp' => $this->otp,
                'purposeTitle' => $this->purposeTitle,
                'purposeDescription' => $this->purposeDescription,
            ],
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
