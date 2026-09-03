/**
 * Conflict Resolution Service
 * Implements different conflict resolution strategies per data type
 */

export enum ConflictStrategy {
  SERVER_WINS = 'server_wins',
  CLIENT_WINS = 'client_wins',
  LAST_WRITE_WINS = 'last_write_wins',
  USER_CHOOSES = 'user_chooses',
  KEEP_BOTH = 'keep_both',
}

export enum DataType {
  ATTENDANCE_RECORD = 'attendance_record',
  EVALUATION_SURVEY = 'evaluation_survey',
  EVENT_METADATA = 'event_metadata',
  IMAGE_UPLOAD = 'image_upload',
  CERTIFICATE = 'certificate',
  EVENT_REGISTRATION = 'event_registration',
  SURVEY_RESPONSE = 'survey_response',
}

export interface ConflictData {
  local: any;
  server: any;
  dataType: DataType;
  timestamp: {
    local: string;
    server: string;
  };
}

export interface ConflictResolution {
  resolved: any;
  strategy: ConflictStrategy;
  merged?: boolean;
}

/**
 * Maps data types to their conflict resolution strategies
 */
const DATA_TYPE_STRATEGY_MAP: Record<DataType, ConflictStrategy> = {
  [DataType.ATTENDANCE_RECORD]: ConflictStrategy.SERVER_WINS, // Official data
  [DataType.EVALUATION_SURVEY]: ConflictStrategy.LAST_WRITE_WINS, // User answers - client wins
  [DataType.EVENT_METADATA]: ConflictStrategy.USER_CHOOSES, // Editable content
  [DataType.IMAGE_UPLOAD]: ConflictStrategy.KEEP_BOTH, // Files
  [DataType.CERTIFICATE]: ConflictStrategy.SERVER_WINS, // Server wins HARD
  [DataType.EVENT_REGISTRATION]: ConflictStrategy.SERVER_WINS, // Official data
  [DataType.SURVEY_RESPONSE]: ConflictStrategy.LAST_WRITE_WINS, // User answers - client wins
};

/**
 * Conflict Resolution Service
 */
export class ConflictResolutionService {
  /**
   * Get conflict strategy for a data type
   */
  static getStrategy(dataType: DataType): ConflictStrategy {
    return DATA_TYPE_STRATEGY_MAP[dataType] || ConflictStrategy.SERVER_WINS;
  }

  /**
   * Resolve conflict based on data type strategy
   */
  static resolveConflict(conflict: ConflictData): ConflictResolution {
    const strategy = this.getStrategy(conflict.dataType);

    switch (strategy) {
      case ConflictStrategy.SERVER_WINS:
        return this.resolveServerWins(conflict);

      case ConflictStrategy.CLIENT_WINS:
      case ConflictStrategy.LAST_WRITE_WINS:
        return this.resolveLastWriteWins(conflict);

      case ConflictStrategy.KEEP_BOTH:
        return this.resolveKeepBoth(conflict);

      case ConflictStrategy.USER_CHOOSES:
        // Return both options for user to choose
        return {
          resolved: { local: conflict.local, server: conflict.server },
          strategy: ConflictStrategy.USER_CHOOSES,
        };

      default:
        return this.resolveServerWins(conflict);
    }
  }

  /**
   * Server wins - use server data
   */
  private static resolveServerWins(conflict: ConflictData): ConflictResolution {
    return {
      resolved: conflict.server,
      strategy: ConflictStrategy.SERVER_WINS,
    };
  }

  /**
   * Last write wins - use most recent timestamp
   */
  private static resolveLastWriteWins(conflict: ConflictData): ConflictResolution {
    const localTime = new Date(conflict.timestamp.local).getTime();
    const serverTime = new Date(conflict.timestamp.server).getTime();

    if (localTime > serverTime) {
      return {
        resolved: conflict.local,
        strategy: ConflictStrategy.LAST_WRITE_WINS,
      };
    }

    return {
      resolved: conflict.server,
      strategy: ConflictStrategy.LAST_WRITE_WINS,
    };
  }

  /**
   * Keep both - merge or keep separate
   */
  private static resolveKeepBoth(conflict: ConflictData): ConflictResolution {
    // For images/uploads, we typically want to keep both versions
    // Return an array or object containing both
    return {
      resolved: {
        local: conflict.local,
        server: conflict.server,
        versions: [conflict.local, conflict.server],
      },
      strategy: ConflictStrategy.KEEP_BOTH,
      merged: false,
    };
  }

  /**
   * Resolve user choice (called after user selects)
   */
  static resolveUserChoice(
    conflict: ConflictData,
    userChoice: 'local' | 'server' | 'merge'
  ): ConflictResolution {
    switch (userChoice) {
      case 'local':
        return {
          resolved: conflict.local,
          strategy: ConflictStrategy.USER_CHOOSES,
        };

      case 'server':
        return {
          resolved: conflict.server,
          strategy: ConflictStrategy.USER_CHOOSES,
        };

      case 'merge':
        return {
          resolved: this.mergeData(conflict.local, conflict.server),
          strategy: ConflictStrategy.USER_CHOOSES,
          merged: true,
        };

      default:
        return this.resolveServerWins(conflict);
    }
  }

  /**
   * Merge two data objects (simple merge - can be enhanced)
   */
  private static mergeData(local: any, server: any): any {
    // Simple merge strategy - prefer local for most fields, server for IDs
    return {
      ...server,
      ...local,
      id: server.id || local.id, // Prefer server ID
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Detect if there's a conflict between local and server data
   */
  static hasConflict(local: any, server: any, dataType: DataType): boolean {
    if (!local || !server) {
      return false;
    }

    // For most cases, check if updated_at timestamps differ
    const localUpdated = local.updated_at || local.created_at;
    const serverUpdated = server.updated_at || server.created_at;

    if (!localUpdated || !serverUpdated) {
      return false;
    }

    // If timestamps are different, there might be a conflict
    // But we need to check if the actual data differs
    return JSON.stringify(local) !== JSON.stringify(server);
  }
}
