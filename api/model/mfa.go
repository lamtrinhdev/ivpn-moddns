package model

// MFASettings represents the settings for multi-factor authentication.
type MFASettings struct {
	TOTP TotpSettings `json:"totp" bson:"totp"`
}

// TotpSettings represents the settings for TOTP.
type TotpSettings struct {
	Enabled         bool     `json:"enabled" bson:"enabled"`     // Indicates if TOTP is enabled.
	Secret          string   `json:"-" bson:"secret"`            // The secret key used for TOTP generation.
	BackupCodes     []string `json:"-" bson:"backup_codes"`      // The backup codes for TOTP.
	BackupCodesUsed []string `json:"-" bson:"backup_codes_used"` // Indicates which of the backup codes have been used.
}

type TOTPNew struct {
	Secret  string `json:"secret"`
	Account string `json:"account"`
	URI     string `json:"uri"`
}

type TOTPBackup struct {
	BackupCodes []string `json:"backup_codes"`
}

// MfaData represents the data required for multi-factor authentication sent in HTTP headers.
type MfaData struct {
	OTP     string   `json:"otp"`
	Methods []string `json:"methods"`
}
