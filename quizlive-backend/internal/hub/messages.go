package hub

import "encoding/json"

// InMessage is a message received from a WebSocket client.
type InMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// OutMessage is a message sent to a WebSocket client.
type OutMessage struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

func mustMarshal(v any) []byte {
	b, _ := json.Marshal(v)
	return b
}
