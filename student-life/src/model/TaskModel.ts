export enum TaskStatus {
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
}

export enum TaskPriority {
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
}

export class TaskDTO {
  id: string;            // UUID -> string
  title: string;
  description?: string;
  deadline: string;      
  status: TaskStatus;    // enum dạng chuỗi
  priority: TaskPriority;// enum dạng chuỗi

  constructor(id: string, title: string, description: string | undefined, deadline: string, status: string, priority: string) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.deadline = deadline;
    this.status = TaskStatus[status as keyof typeof TaskStatus];
    this.priority = TaskPriority[priority as keyof typeof TaskPriority];
}
}