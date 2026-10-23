import { Platform, Share } from 'react-native';

/**
 * Give the user a copy of all their data as JSON (includes soft-deleted rows so nothing is hidden).
 * Web downloads a file; native opens the share sheet.
 * @param {import('@slotwise/core/types.js').TreeNode[]} nodes
 * @param {string} fileName
 */
export async function exportNodes(nodes, fileName) {
  const json = JSON.stringify(
    { app: 'slotwise', version: 1, exportedAt: new Date().toISOString(), nodes },
    null,
    2,
  );
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ message: json, title: fileName });
}
