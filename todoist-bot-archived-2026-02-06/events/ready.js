module.exports = {
  name: 'clientReady',
  once: true,
  execute(client, _todoistService) {
    console.log(`✅ ${client.user.tag} is online!`);

    client.syncService.start();
    client.dailyOverview.start();

    console.log('Todoist bot services started');
  },
};
