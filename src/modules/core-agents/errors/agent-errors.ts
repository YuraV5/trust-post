import { AppConfigException, AppInternalServerException } from '../../../shared/errors/app-errors';

export class AgentClientConfigException extends AppConfigException {
  constructor(message = 'Agent client configuration is invalid') {
    super(message);
  }
}

export class AgentRequestFailedException extends AppInternalServerException {
  constructor(message = 'Agent request failed', details?: string[]) {
    super(message, details);
  }
}

export class AgentEmptyResponseException extends AppInternalServerException {
  constructor(message = 'Agent returned an empty response') {
    super(message);
  }
}

export class AgentInvalidResponseException extends AppInternalServerException {
  constructor(message = 'Agent returned an invalid response', details?: string[]) {
    super(message, details);
  }
}
