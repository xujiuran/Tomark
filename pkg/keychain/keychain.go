package keychain

import (
	"errors"

	"github.com/zalando/go-keyring"
)

const ServiceName = "TomarkAI"

// SaveAPIKey stores the AI API key in the OS Keychain / Credential Manager.
func SaveAPIKey(key string) error {
	if key == "" {
		return errors.New("empty API key")
	}
	return keyring.Set(ServiceName, "ai_api_key", key)
}

// GetAPIKey retrieves the AI API key from the OS Keychain / Credential Manager.
func GetAPIKey() (string, error) {
	val, err := keyring.Get(ServiceName, "ai_api_key")
	if err != nil {
		if errors.Is(err, keyring.ErrNotFound) {
			return "", nil
		}
		return "", err
	}
	return val, nil
}

// DeleteAPIKey removes the API key from the OS Keychain.
func DeleteAPIKey() error {
	err := keyring.Delete(ServiceName, "ai_api_key")
	if errors.Is(err, keyring.ErrNotFound) {
		return nil
	}
	return err
}
