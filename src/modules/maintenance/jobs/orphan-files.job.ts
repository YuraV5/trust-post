// async function cleanOrphanFiles() {
//   const client = cloudinaryClient.getClient();

//   // 1. Отримуємо всі файли з Cloudinary
//   let nextCursor: string | undefined;
//   const allCloudFiles: string[] = [];

//   do {
//     const res = await client.api.resources({ type: 'upload', max_results: 100, next_cursor: nextCursor });
//     allCloudFiles.push(...res.resources.map(f => f.public_id));
//     nextCursor = res.next_cursor;
//   } while (nextCursor);

//   // 2. Отримуємо з БД усі keys
//   const usedKeys = await fileRepository.find({ select: ['storageKey'] });
//   const usedKeysSet = new Set(usedKeys.map(k => k.storageKey));

//   // 3. Видаляємо все що не використовується
//   for (const key of allCloudFiles) {
//     if (!usedKeysSet.has(key)) {
//       await client.uploader.destroy(key);
//     }
//   }
// }
