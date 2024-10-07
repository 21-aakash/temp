import * as vscode from 'vscode';
import { ChatPanel } from './panels/ChatPaneel';
import { commandHandler } from './features/commandRegister';
import { handleAddCommentsCommand } from './features/comment';
import { handleFixCode } from './features/fix-code';
import CodeGenerator from './features/generateCode-nlp';
import { activateCodeSuggestionListener } from './features/predict-code';

export function activate(context: vscode.ExtensionContext) {
    // Register the Chat Panel for the activity bar (in the sidebar)
    const chatProvider = new ChatPanel(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatPanel.viewType, chatProvider)
    );

     
    const codeGenerator = new CodeGenerator(context.extensionUri);
    activateCodeSuggestionListener();

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChat.explainCode', () => {
            commandHandler('explainCode');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChat.fixCode', () => {
            commandHandler('fixCode');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChat.writeDocstrings', () => {
            commandHandler('writeDocstrings');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChat.generateTests', () => {
            commandHandler('generateTests');
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChat.exploreCodebase', () => {
            commandHandler('exploreCodebase');
        })
    );

    // Comment feature
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChatbot.addComments', handleAddCommentsCommand)
    );

    // Fix code feature
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChatbot.fixCode', handleFixCode)
    );

    // NLP code generation feature
    context.subscriptions.push(
        vscode.commands.registerCommand('aiChatbot.nlpGenerateCode', async () => {
            codeGenerator.promptForCodeGeneration();
        })
    );


    context.subscriptions.push(
        vscode.commands.registerCommand('extension.insertCodeBlock', (codeBlock: string) => {
            insertCodeBlock(codeBlock);
        })
    );
    

    vscode.window.registerWebviewViewProvider('ChatPanel.viewType', {
        resolveWebviewView: (webviewView) => {
            webviewView.webview.onDidReceiveMessage(message => {
                if (message.command === 'insertCodeBlock') {
                    // Trigger the 'insertCodeBlock' command with the dynamic code block from the message
                    const codeBlock = message.text; // Get the code block from the message
                    vscode.commands.executeCommand('extension.insertCodeBlock', codeBlock);
                }
            });
        }
    });
    


    // Insert the code block into the editor at the cursor position
    function insertCodeBlock(codeBlock: string) {
        const editor = vscode.window.activeTextEditor; // Get the active text editor
        if (editor) {
            const position = editor.selection.active; // Get the current cursor position
    
            // Create an edit to insert the text
            editor.edit(editBuilder => {
                editBuilder.insert(position, codeBlock); // Insert the code block at the cursor position
            }).then(success => {
                if (success) {
                    // Move the cursor to the end of the inserted text
                    const newPosition = position.translate(0, codeBlock.length);
                    editor.selection = new vscode.Selection(newPosition, newPosition); // Set the cursor position
                }
            });
        }
    }
    
    
}

export function deactivate() {}
