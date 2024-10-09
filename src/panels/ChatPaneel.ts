
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import archiver from 'archiver';

import axios from 'axios';
import { handleWebviewMessage } from '../services/messageHandler'; // Import message handler
import { loadContextData, addContextData } from '../services/contextService'; // Import context handler
import { loadHtml } from '../services/htmlLoader'; // Import HTML loader

export class ChatPanel implements vscode.WebviewViewProvider {
    public static readonly viewType = 'aiChat.chatPanel';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.join(this._extensionUri.fsPath, 'media'))]
        };

        // Load the project setup HTML first
        webviewView.webview.html = this._getHtmlForProjectSetup(webviewView.webview);

        // Listen for messages from the webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'selectFolder':
                    // Open folder picker and send folder path back to the webview
                    const folderUri = await vscode.window.showOpenDialog({
                        canSelectFiles: false,
                        canSelectFolders: true,
                        canSelectMany: false,
                        openLabel: 'Select Folder'
                    });
                    if (folderUri && folderUri.length > 0) {
                        webviewView.webview.postMessage({ command: 'selectedFolder', folderPath: folderUri[0].fsPath });
                    }
                    break;
                case 'submitProject':
                    // Call API with the folder as zip and switch to chat.html
                    const { projectName, folderPath } = message;
                    //await this._sendFolderAsZip(folderPath);
                    console.log(`Project setup submitted for ${projectName} at ${folderPath}`);
                    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                    break;
            }


            await handleWebviewMessage(message, webviewView, this);

        });
    }


    // Method to load the project setup HTML
    private _getHtmlForProjectSetup(webview: vscode.Webview): string {
        return loadHtml(webview, this._extensionUri, 'projectSetup.html');
    }

    // Load the HTML for the chat view
    private _getHtmlForWebview(webview: vscode.Webview): string {
        return loadHtml(webview, this._extensionUri, 'chat.html');
    }

    // Method to add a message to the webview
    public addMessageToWebview(sender: string, message: string) {
        if (this._view) {
            this._view.webview.postMessage({ command: 'addMessage', sender, text: message });
        }
    }

    
    // Load the HTML for the context view
    private _getHtmlForContextView(webview: vscode.Webview): string {
        return loadHtml(webview, this._extensionUri, 'context.html');
    }

    

    // Load the HTML for the context-specific data view
    private _getHtmlForContextviewView(webview: vscode.Webview): string {
        return loadHtml(webview, this._extensionUri, 'contextView.html');
    }

    // Load context data into the webview
    private loadContextData(webview: vscode.Webview) {
        loadContextData(webview);
    }

    // Add context data based on the file list and ID
    public addContextData(fileListId: string, files: string[]) {
        addContextData(fileListId, files);
    }





    




     
    // Method to send the folder as a zip (dummy implementation for now)
    private async _sendFolderAsZip(folderPath: string) {
        // Implement API call logic here
        console.log(`Sending folder at ${folderPath} as a zip...`);
    
        const zipFilePath = path.join(folderPath, 'project.zip');
        const output = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });
    
        archive.pipe(output);
        archive.directory(folderPath, false);
        await archive.finalize();
    
        // Send zip file to backend
        const zipContent = fs.readFileSync(zipFilePath);
         
        return zipContent;
        


        await axios.post('your-api-endpoint', zipContent, {
            headers: {
                'Content-Type': 'application/zip'
            }
        });
    
    
        
    
    
    
    }



}
