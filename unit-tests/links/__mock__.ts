import { ILinksService } from "../../src/modules/links/interfaces/links-service";

export const mockLinksService: ILinksService = {
  generateTemporaryLink: jest.fn(),
};