import { Canvas, FabricObject } from 'fabric';

export interface Command {
  execute(): void;
  undo(): void;
}

export class AddObjectCommand implements Command {
  constructor(
    private canvas: Canvas,
    private object: FabricObject,
  ) {}

  execute() {
    this.canvas.add(this.object);
    this.canvas.setActiveObject(this.object);
    this.canvas.requestRenderAll();
  }

  undo() {
    this.canvas.remove(this.object);
    this.canvas.requestRenderAll();
  }
}

export class FinalizeAddCommand implements Command {
  constructor(
    private canvas: Canvas,
    private object: FabricObject,
  ) {}

  execute() {
    if (!this.canvas.getObjects().includes(this.object)) {
      this.canvas.add(this.object);
    }
    this.canvas.requestRenderAll();
  }

  undo() {
    this.canvas.remove(this.object);
    this.canvas.requestRenderAll();
  }
}

export class HistoryManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxSize = 50;

  execute(command: Command) {
    command.execute();
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    const command = this.undoStack.pop();
    if (!command) return false;
    command.undo();
    this.redoStack.push(command);
    return true;
  }

  redo() {
    const command = this.redoStack.pop();
    if (!command) return false;
    command.execute();
    this.undoStack.push(command);
    return true;
  }

  canUndo() {
    return this.undoStack.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
