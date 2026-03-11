module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (!client.shadowAwayService) return;

    try {
      await client.shadowAwayService.handleMessageCreate(message);
    } catch (error) {
      client.logger.error('messageCreate handler failed', error, {
        event: 'shadowaway_message_create_failed',
        messageId: message.id,
      });
    }
  },
};
