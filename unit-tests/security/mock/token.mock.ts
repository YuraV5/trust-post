import { ITokensService } from "../../../src/modules/security/interfaces";

export const mockJwtService = {
  signAsync: jest.fn(),
  verifyAsync: jest.fn()
}

export const mockTokensService: ITokensService = {
  generateAccess: jest.fn(),
  generateRefresh: jest.fn(),
  verifyAccess: jest.fn(),
  verifyRefresh: jest.fn(),
};