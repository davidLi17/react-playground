``` mermaid
sequenceDiagram
participant A as 用户A
participant S as 信令服务器
participant B as 用户B

A->>S: 1. 加入房间
B->>S: 1. 加入相同房间
A->>S: 2. 发起呼叫(createOffer)
S->>B: 3. 转发offer
B->>S: 4. 发送answer
S->>A: 5. 转发answer
A-->>B: 6. 建立P2P连接
```