class SyncService {
  constructor(client, todoistService) {
    this.client = client;
    this.todoistService = todoistService;
    this.lastSyncTime = null;
    this.syncInterval = null;
    this.taskCache = new Map();
    this.isSyncing = false;
  }

  start() {
    const intervalSeconds = parseInt(process.env.SYNC_INTERVAL_SECONDS || '30', 10);
    this.syncInterval = setInterval(() => {
      this.sync();
    }, intervalSeconds * 1000);
    console.log(`Sync service started with ${intervalSeconds}s interval`);
    this.sync();
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync() {
    if (this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    try {
      const tasks = await this.todoistService.getAllTasks();
      if (!Array.isArray(tasks)) {
        console.error('Sync: getAllTasks() did not return an array');
        return;
      }
      const currentTaskIds = new Set(tasks.map((t) => t.id));

      const newTasks = tasks.filter((task) => !this.taskCache.has(task.id));
      const deletedTasks = Array.from(this.taskCache.keys()).filter(
        (id) => !currentTaskIds.has(id),
      );
      const updatedTasks = tasks.filter((task) => {
        const cached = this.taskCache.get(task.id);
        return cached && JSON.stringify(cached) !== JSON.stringify(task);
      });

      this.taskCache.clear();
      tasks.forEach((task) => {
        this.taskCache.set(task.id, task);
      });

      this.lastSyncTime = new Date();

      if (newTasks.length > 0 || deletedTasks.length > 0 || updatedTasks.length > 0) {
        console.log(
          `Sync complete: ${newTasks.length} new, ${deletedTasks.length} deleted, ${updatedTasks.length} updated`,
        );
      }
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  getCachedTasks() {
    return Array.from(this.taskCache.values());
  }

  getLastSyncTime() {
    return this.lastSyncTime;
  }
}

module.exports = SyncService;
