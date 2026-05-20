package hub

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	writeWait  = 10 * time.Second
	pongWait   = 60 * time.Second
	pingPeriod = (pongWait * 9) / 10
	maxMsgSize = 8192
)

// Client represents one WebSocket connection (host or team).
type Client struct {
	Room   *Room
	Conn   *websocket.Conn
	Send   chan []byte
	Role   string    // "host" | "team"
	TeamID uuid.UUID // zero for host
}

// NewClient creates a new Client.
func NewClient(room *Room, conn *websocket.Conn, role string) *Client {
	return &Client{
		Room: room,
		Conn: conn,
		Send: make(chan []byte, 256),
		Role: role,
	}
}

// WritePump pumps messages from the send channel to the WebSocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// ReadPump pumps messages from the WebSocket connection to the room.
func (c *Client) ReadPump() {
	defer func() {
		c.Room.Unregister(c)
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMsgSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, raw, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				slog.Warn("ws read error", "err", err)
			}
			break
		}

		var msg InMessage
		if err := json.Unmarshal(raw, &msg); err != nil {
			c.SendError("invalid message format")
			continue
		}
		c.Room.HandleMessage(c, msg)
	}
}

// SendMsg sends a typed message to this client.
func (c *Client) SendMsg(typ string, payload any) {
	data := mustMarshal(OutMessage{Type: typ, Payload: payload})
	select {
	case c.Send <- data:
	default:
		slog.Warn("ws send buffer full, dropping message", "type", typ)
	}
}

// SendError sends an error message to this client.
func (c *Client) SendError(msg string) {
	c.SendMsg("error", map[string]string{"message": msg})
}
