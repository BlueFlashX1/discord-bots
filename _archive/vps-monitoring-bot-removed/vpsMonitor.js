const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class VPSMonitor {
  constructor({ host, sshKey, logger }) {
    this.host = host;
    this.sshKey = sshKey;
    this.logger = logger;
    this.sshOptions = `-i ${sshKey} -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null`;
  }

  async executeCommand(command) {
    try {
      const sshCommand = `ssh ${this.sshOptions} ${this.host} "${command.replace(/"/g, '\\"')}"`;
      const { stdout, stderr } = await execAsync(sshCommand);
      if (stderr && !stderr.includes('Warning: Permanently added')) {
        this.logger.warn('SSH stderr:', stderr);
      }
      return stdout.trim();
    } catch (error) {
      this.logger.error(`Error executing command: ${command}`, error);
      throw error;
    }
  }

  async getSystemResources() {
    try {
      const [memory, cpu, load, disk, uptime] = await Promise.all([
        this.executeCommand('free -h'),
        this.executeCommand('top -bn1 | head -5'),
        this.executeCommand('uptime'),
        this.executeCommand('df -h / | tail -1'),
        this.executeCommand('uptime -p'),
      ]);

      return {
        memory,
        cpu,
        load,
        disk,
        uptime,
      };
    } catch (error) {
      this.logger.error('Error getting system resources', error);
      throw error;
    }
  }

  async getPM2Status() {
    try {
      const pm2List = await this.executeCommand('pm2 jlist');
      const pm2Stats = await this.executeCommand('pm2 jlist | python3 -c "import json, sys; data = json.load(sys.stdin); total_mem = sum(p[\'monit\'][\'memory\'] / 1024 / 1024 for p in data); total_cpu = sum(p[\'monit\'][\'cpu\'] for p in data); print(f\'{total_mem:.1f}|{total_cpu:.1f}|{len(data)}\')" 2>&1');

      const [totalMem, totalCpu, processCount] = pm2Stats.split('|');

      return {
        processes: JSON.parse(pm2List),
        totalMemory: parseFloat(totalMem),
        totalCPU: parseFloat(totalCpu),
        processCount: parseInt(processCount),
      };
    } catch (error) {
      this.logger.error('Error getting PM2 status', error);
      throw error;
    }
  }

  async getBotStatus() {
    try {
      const pm2List = await this.executeCommand('pm2 list');
      return pm2List;
    } catch (error) {
      this.logger.error('Error getting bot status', error);
      throw error;
    }
  }

  async getDetailedStats() {
    try {
      const [resources, pm2Status] = await Promise.all([
        this.getSystemResources(),
        this.getPM2Status(),
      ]);

      return {
        ...resources,
        pm2: pm2Status,
      };
    } catch (error) {
      this.logger.error('Error getting detailed stats', error);
      throw error;
    }
  }

  async disconnect() {
    // SSH connections are stateless, no cleanup needed
    this.logger.info('VPS Monitor disconnected');
  }
}

module.exports = VPSMonitor;
