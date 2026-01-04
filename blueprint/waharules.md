# ⚠️ WAHA - How to Avoid Blocking

**Source**: [WAHA Documentation](https://waha.devlike.pro/docs/overview/%EF%B8%8F-how-to-avoid-blocking/)

## Guidelines to Follow

### 1. Only Reply to Messages

When developing a bot for WhatsApp, you should **never initiate a conversation**. Instead, your bot should only reply to messages that it receives. This will prevent your bot from being flagged as spam by WhatsApp's users and algorithms.

**Solution**: Use a short link like `http://wa.me/7911111111?text=Hi` so a user can click on it and start the dialog with the bot first.

### 2. Avoid Spamming and Sending Unnecessary Content

Sending too many messages or sending content that the user did not request can lead to your bot being blocked. Make sure to only send relevant and useful information to the user. Additionally, **do not send too many messages at once**, as this can also trigger spam filters.

### 3. Other Considerations

There are other guidelines to follow when developing a bot for WhatsApp, such as:
- Avoiding the use of banned words
- Not sharing sensitive or inappropriate content
- Reading WhatsApp's policies thoroughly to ensure compliance

## How to Process Messages

When processing messages in your bot, follow these steps to avoid being flagged as spam:

1. **Send "seen"** before processing the message
   - API: `POST /api/sendSeen/`

2. **Start typing** before sending a message and wait for a random interval depending on the size of the message
   - API: `POST /api/startTyping/`

3. **Stop typing** before sending the message
   - API: `POST /api/stopTyping/`

4. **Send the text message**
   - API: `POST /api/sendText`

By following these steps, you can ensure that your bot processes messages in a way that's compliant with WhatsApp's guidelines and reduces the risk of being blocked.

## How to Avoid Getting Banned

WhatsApp knows that it's uncommon for someone to send so many messages or bulk messages to people they've never talked to before, so it is considered spam/marketing junk pretty quickly.

### ✅ Dos and Don'ts

1. **IMPORTANT**: Do NOT send messages which get you reported. As long as you don't get reports from users who you sent a message to, your account will be mostly fine.

2. Having real content, a survey that the person agreed with is different from a marketing message on a Saturday night.

3. **Send messages written in different ways**; you could make a script that places spacebars randomly in your string AND includes the person's (first) name.

4. **Never use fixed times**; always go for sending the first message, wait a random time between 30 and 60 seconds, and then send the second message.

5. **Always try to group contacts by their area code**; WhatsApp expects a regular person to talk mostly with contacts that are within the same area of your phone number.

6. **Have a profile picture**; this is not related to WhatsApp Bots Catcher® but sending a new message to someone without having a picture/name/status will elevate your chances of being manually tagged as spam.

7. **Send "seen" confirmation** to messages or disable it on WhatsApp.

8. **Avoid sending links** that were previously marked as spam on WhatsApp or non-HTTPS. A URL shortener is a good idea.

9. **IMPORTANT**: It's terrible if you send messages 24/7 without giving it some time to wait. Random delays between messages are not enough; send a reasonable amount of messages keeping in mind your conversion rate.
   - **Example**: For one hour, send a maximum of 4 messages per contact that have replied to your message, and stop sending messages for one hour, then start again.
   - **Don't send messages without stopping for a while between every "package"**.

10. **Send only one short message** when starting a conversation; one should not send long texts or multiple messages without the user's consent.

### 🎯 Keep in Mind

1. For every message you send to someone who doesn't have your number in their contact list, they are asked if it's spam. **Being tagged as spam a few times (5-10) will get you banned**.

2. WhatsApp records every movement you make; you can even check the logs when sending a simple support email. It contains all kinds of information, so **act as human as possible**.

3. Try to **engage in conversations**; as long as you send a message and the person doesn't automatically block you, it'll be quite okay. People constantly talking to you and adding you to their contact list will make your number stronger against a ban.

4. Think about it like a **points system**:
   - You start with zero points (negative if your device was previously blacklisted)
   - If you reach below zero, you are out
   - If you engage in conversations, you get a point
   - If you are tagged as spam, you lose some points
   - If you are blocked, you may lose more points

5. Finally, if your content is spam, it doesn't matter if you are using a broadcast list, group, or direct contact; **you will still be banned**.

### 💡 Best Practice

As an API, we say all that's left to do right now is to agree with WhatsApp's policy, not send spam messages, and **always wait for the other person to contact you first**.

You could do this by sending an SMS to the person with a link to start a chat on WhatsApp with you by link: `https://wa.me/12132132131?text=Hi`

---

## Implementation Recommendations for Our System

Based on these rules, our broadcast system should:

1. ✅ **Random Delays**: Already implemented (5-20 seconds configurable)
2. ✅ **Spintax**: Already implemented for message variation
3. ✅ **Device Rotation**: Already implemented (round-robin)
4. ✅ **Typing Indicators**: Implemented in BroadcastWorker (`startTyping`, `stopTyping`)
5. ✅ **"Seen" Confirmation**: Implemented in BroadcastWorker (`sendSeen`)
6. ⚠️ **TODO**: Add hourly/daily message limits per campaign
7. ⚠️ **TODO**: Add "cooling period" between campaign batches
8. ⚠️ **TODO**: Group contacts by area code for better targeting
9. ⚠️ **TODO**: Validate profile picture exists before allowing broadcasts
10. ⚠️ **TODO**: Implement URL shortener integration for links
