const { TodoistApi } = require('@doist/todoist-api-typescript');

class TodoistService {
  constructor(apiToken) {
    if (!apiToken) {
      throw new Error('Todoist API token is required');
    }
    this.api = new TodoistApi(apiToken);
    this.projectsCache = new Map();
    this.projectsCacheTime = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getAllTasks() {
    try {
      const response = await this.api.getTasks();

      // Handle paginated response (v2 API returns { items: [], nextCursor: string })
      if (Array.isArray(response)) {
        return response;
      }

      if (response && typeof response === 'object' && !Array.isArray(response)) {
        // Check if it has results property (paginated response - v2 API uses 'results')
        const tasksArray = response.results || response.items;
        if (tasksArray && Array.isArray(tasksArray)) {
          // Handle pagination - get all pages
          let allTasks = [...tasksArray];
          let cursor = response.nextCursor;

          // Limit pagination to prevent infinite loops (max 10 pages)
          let pageCount = 0;
          while (cursor && pageCount < 10) {
            try {
              const nextResponse = await this.api.getTasks({ cursor });
              const nextTasks = nextResponse?.results || nextResponse?.items;
              if (nextResponse && nextTasks && Array.isArray(nextTasks)) {
                allTasks = [...allTasks, ...nextTasks];
                cursor = nextResponse.nextCursor;
                pageCount++;
              } else {
                break;
              }
            } catch (err) {
              console.warn('Error fetching next page:', err.message);
              break;
            }
          }

          return allTasks;
        }
      }

      console.warn('getTasks() returned unexpected format:', typeof response);
      if (response && typeof response === 'object') {
        console.warn('Response keys:', Object.keys(response));
        console.warn('Has items?', response.items ? 'yes' : 'no');
        if (response.items) {
          console.warn('Items type:', typeof response.items, Array.isArray(response.items));
        }
      }
      return [];
    } catch (error) {
      console.error('Error fetching tasks:', error.message || error);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      return [];
    }
  }

  async getProjects() {
    try {
      const now = Date.now();
      if (this.projectsCacheTime && now - this.projectsCacheTime < this.cacheTimeout) {
        return Array.from(this.projectsCache.values());
      }

      const response = await this.api.getProjects();

      // Handle paginated response (v2 API returns { results: [], nextCursor: string })
      let projects = [];
      if (Array.isArray(response)) {
        projects = response;
      } else if (response && typeof response === 'object') {
        const projectsArray = response.results || response.items;
        if (projectsArray && Array.isArray(projectsArray)) {
          projects = [...projectsArray];
          // Handle pagination if needed
          let cursor = response.nextCursor;
          let pageCount = 0;
          while (cursor && pageCount < 10) {
            try {
              const nextResponse = await this.api.getProjects({ cursor });
              const nextProjects = nextResponse?.results || nextResponse?.items;
              if (nextResponse && nextProjects && Array.isArray(nextProjects)) {
                projects = [...projects, ...nextProjects];
                cursor = nextResponse.nextCursor;
                pageCount++;
              } else {
                break;
              }
            } catch (err) {
              console.warn('Error fetching next projects page:', err.message);
              break;
            }
          }
        }
      }

      if (projects.length === 0) {
        console.warn('getProjects() returned no projects');
        return Array.from(this.projectsCache.values());
      }

      this.projectsCache.clear();
      projects.forEach((project) => {
        this.projectsCache.set(project.id, project);
      });
      this.projectsCacheTime = now;
      return projects;
    } catch (error) {
      console.error('Error fetching projects:', error.message || error);
      if (error.response) {
        console.error('API Response:', error.response.status, error.response.data);
      }
      // Return cached projects if available
      return Array.from(this.projectsCache.values());
    }
  }

  async getProjectById(projectId) {
    if (this.projectsCache.has(projectId)) {
      return this.projectsCache.get(projectId);
    }
    const projects = await this.getProjects();
    return projects.find((p) => p.id === projectId);
  }

  async getProjectName(projectId) {
    const project = await this.getProjectById(projectId);
    return project ? project.name : 'Inbox';
  }

  async createTask(content, options = {}) {
    try {
      const taskData = {
        content,
      };

      if (options.dueDate) {
        taskData.dueString = options.dueDate;
      } else if (options.dueString) {
        taskData.dueString = options.dueString;
      }

      if (options.projectId) {
        taskData.projectId = options.projectId;
      }

      if (options.priority) {
        taskData.priority = options.priority;
      }

      if (options.labelIds && options.labelIds.length > 0) {
        taskData.labelIds = options.labelIds;
      }

      if (options.parentId) {
        taskData.parentId = options.parentId;
      }

      const task = await this.api.addTask(taskData);
      return task;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(taskId, updates) {
    try {
      const updateData = {};

      if (updates.dueDate) {
        updateData.dueString = updates.dueDate;
      } else if (updates.dueString) {
        updateData.dueString = updates.dueString;
      }

      if (updates.content) {
        updateData.content = updates.content;
      }

      if (updates.priority !== undefined) {
        updateData.priority = updates.priority;
      }

      if (updates.labelIds) {
        updateData.labelIds = updates.labelIds;
      }

      const task = await this.api.updateTask(taskId, updateData);
      return task;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async closeTask(taskId) {
    try {
      await this.api.closeTask(taskId);
      return true;
    } catch (error) {
      console.error('Error closing task:', error);
      throw error;
    }
  }

  async reopenTask(taskId) {
    try {
      await this.api.reopenTask(taskId);
      return true;
    } catch (error) {
      console.error('Error reopening task:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      await this.api.deleteTask(taskId);
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  async getTaskById(taskId) {
    try {
      const task = await this.api.getTask(taskId);
      return task;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw error;
    }
  }

  async getSubTasks(parentId) {
    try {
      const allTasks = await this.getAllTasks();
      return allTasks.filter((task) => task.parentId === parentId);
    } catch (error) {
      console.error('Error fetching subtasks:', error);
      return [];
    }
  }

  getSubTasksFromList(tasks, parentId) {
    return tasks.filter((task) => task.parentId === parentId);
  }

  async getLabels() {
    try {
      const response = await this.api.getLabels();

      // Handle paginated response (v2 API returns { results: [], nextCursor: string })
      if (Array.isArray(response)) {
        return response;
      }

      if (response && typeof response === 'object') {
        const labelsArray = response.results || response.items;
        if (labelsArray && Array.isArray(labelsArray)) {
          let labels = [...labelsArray];
          let cursor = response.nextCursor;
          let pageCount = 0;

          while (cursor && pageCount < 10) {
            try {
              const nextResponse = await this.api.getLabels({ cursor });
              const nextLabels = nextResponse?.results || nextResponse?.items;
              if (nextResponse && nextLabels && Array.isArray(nextLabels)) {
                labels = [...labels, ...nextLabels];
                cursor = nextResponse.nextCursor;
                pageCount++;
              } else {
                break;
              }
            } catch (err) {
              console.warn('Error fetching next labels page:', err.message);
              break;
            }
          }

          return labels;
        }
      }

      console.warn('getLabels() returned unexpected format:', typeof response);
      return [];
    } catch (error) {
      console.error('Error fetching labels:', error);
      return [];
    }
  }

  async getSections(projectId) {
    try {
      const sections = await this.api.getSections();
      return sections.filter((section) => section.projectId === projectId);
    } catch (error) {
      console.error('Error fetching sections:', error);
      throw error;
    }
  }

  organizeTasksByDueDate(tasks) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const organized = {
      today: [],
      tomorrow: [],
      other: [],
      noDueDate: [],
    };

    tasks.forEach((task) => {
      if (!task.due) {
        organized.noDueDate.push(task);
        return;
      }

      const dueDate = new Date(task.due.date);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate.getTime() === today.getTime()) {
        organized.today.push(task);
      } else if (dueDate.getTime() === tomorrow.getTime()) {
        organized.tomorrow.push(task);
      } else if (dueDate < today) {
        organized.other.push(task);
      } else {
        organized.other.push(task);
      }
    });

    return organized;
  }

  organizeTasksByProject(tasks) {
    const organized = {};
    tasks.forEach((task) => {
      const projectId = task.projectId || 'inbox';
      if (!organized[projectId]) {
        organized[projectId] = [];
      }
      organized[projectId].push(task);
    });
    return organized;
  }
}

module.exports = TodoistService;
