const fs = require('fs');
let code = fs.readFileSync('src/components/communication/PrivateChat.tsx', 'utf8');

const replacement = `      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setMessages(msgs);
        
        // If there are unread messages directed to us, mark them read
        const hasUnread = msgs.some((m: PrivateMessage) => 
          m.receiverId === currentUser.id && m.senderId === activeContact.id && !m.read
        );
        if (hasUnread) {
          markMessagesRead();
        }
      }`;

code = code.replace(`      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }`, replacement);

fs.writeFileSync('src/components/communication/PrivateChat.tsx', code, 'utf8');
