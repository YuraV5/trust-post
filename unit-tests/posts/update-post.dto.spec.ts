import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePostDto } from '../../src/modules/posts/dtos/update-post.dto';

describe('UpdatePostDto', () => {
  it('rejects title longer than 100 chars', async () => {
    const dto = plainToInstance(UpdatePostDto, {
      title: 'a'.repeat(101),
    });

    const errors = await validate(dto);
    const titleError = errors.find((error) => error.property === 'title');

    expect(titleError).toBeDefined();
    expect(titleError?.constraints).toHaveProperty('maxLength');
  });

  it('rejects content longer than 2000 chars', async () => {
    const dto = plainToInstance(UpdatePostDto, {
      content: 'a'.repeat(2001),
    });

    const errors = await validate(dto);
    const contentError = errors.find((error) => error.property === 'content');

    expect(contentError).toBeDefined();
    expect(contentError?.constraints).toHaveProperty('maxLength');
  });
});
