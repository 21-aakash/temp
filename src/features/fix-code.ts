import * as vscode from 'vscode';
import { groqChatAPI } from '../services/groqService'; // Import the common Groq service

export async function handleFixCode(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (editor) {
        const selectedText = editor.document.getText(editor.selection);

        if (selectedText) {
            try {
                // Use the shared service with the 'fixCode' command
                let suggestedFix = await groqChatAPI(selectedText, 'fixCode');

                // Trimming unnecessary characters (like ``` at the start and end)
                const lines = suggestedFix.split('\n');
                if (lines[0].startsWith('```')) lines.shift();
                if (lines[lines.length - 1].startsWith('```')) lines.pop();

                const trimmedSuggestedFix = lines.join('\n').trim();

                // Directly apply the fix in the editor without showing a popup
                await editor.edit(editBuilder => {
                    editBuilder.replace(editor.selection, trimmedSuggestedFix);
                });

                vscode.window.showInformationMessage('Code fix applied.');
            } catch (error) {
                vscode.window.showErrorMessage('Failed to get a fix from Groq AI.');
                console.error(error);
            }
        } else {
            vscode.window.showErrorMessage('No code selected.');
        }
    }
}
