import * as vscode from 'vscode';
import { groqChatAPI } from '../services/groqService'; // Import the common Groq service


    class CodeGenerator {
        private extensionUri: vscode.Uri;
        private lastInsertedCodeRange: vscode.Range | null = null; // Store the range of the last inserted code
        private previousGeneratedCode: string | null = null; // Store the previously generated code
    
        constructor(extensionUri: vscode.Uri) {
            this.extensionUri = extensionUri;
        }
    
   // Prompt the user for code generation input
   async promptForCodeGeneration(rephrase: boolean = false, existingPrompt: string | null = null): Promise<void> {
    
     // If rephrasing, first remove the previously inserted code
     if (rephrase && this.lastInsertedCodeRange) {
        this.removeLastInsertedCode();
    }
    
    const prompt = rephrase
        ? await this.getUserInput('Rephrase your prompt for code generation') // Get a new prompt for rephrasing
        : await this.getUserInput('Enter your NLP prompt for code generation');

        
    if (prompt) {
        // Use old generated code as context for rephrasing
        const fullPrompt = rephrase && this.previousGeneratedCode
            ? `Here is the existing code:\n${this.previousGeneratedCode}\nNow, generate new code based on this and the following prompt:\n${prompt}`
            : prompt;

        await this.generateCode(fullPrompt);
    } else {
        this.showInformationMessage('No prompt provided.');
    }
}

   // Generate code based on user prompt
   private async generateCode(prompt: string): Promise<void> {
    try {
     const codePrompt = this.createCodePrompt(prompt);

    if( this.previousGeneratedCode)
    {

        const codePrompt= `Here is the existing code:\n${this.previousGeneratedCode}\nNow, generate new code based on this and the following prompt:\n${prompt}`;
        
        
    }
    else{

        const codePrompt = this.createCodePrompt(prompt);


    }
       

        const suggestedCode = await this.fetchSuggestedCode(codePrompt);

        console.log("Suggested Code:", suggestedCode);
        const trimmedCode = this.cleanCodeResponse(suggestedCode);

        if (trimmedCode) {
            await this.insertCodeIntoEditor(trimmedCode);

            // Store the latest generated code for future rephrasing
            this.previousGeneratedCode = trimmedCode;
        } else {
            this.showErrorMessage('No valid code generated.');
        }
    } catch (error) {
        console.error('Error from Groq API:', error);
        this.showErrorMessage(`Failed to generate code from Lask.AI.${error}`);
    }
}

    // Create the formatted prompt for the code generation API
    private createCodePrompt(prompt: string): string {
        return `
            You are an AI assistant. Your task is to generate code based on the following prompt:
            ${prompt}
            Return only the code without any additional explanation.
        `;
    }

    // Fetch suggested code from the Groq API
    private async fetchSuggestedCode(codePrompt: string): Promise<string> {
        return await groqChatAPI(codePrompt, 'nlpCode');
    }

    // Clean the code response by removing unnecessary characters
    private cleanCodeResponse(suggestedCode: string): string {
        const lines = suggestedCode.split('\n');
        if (lines[0].startsWith('')) lines.shift();
        if (lines[lines.length - 1].startsWith('')) lines.pop();
        return lines.join('\n').trim();
    }

    

    // Insert the cleaned code into the active text editor
    private async insertCodeIntoEditor(code: string): Promise<void> {
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            let position = editor.selection.active;

            const startPosition = position; // Save the start position

            // Insert each character with a delay (for typing effect)
            for (const line of code.split('\n')) {
                for (const char of line) {
                    const editSuccessful = await editor.edit(editBuilder => {
                        editBuilder.insert(position, char);
                    });

                    if (!editSuccessful) {
                        this.showErrorMessage('Failed to insert code into the editor.');
                        return; // Exit if insertion fails
                    }

                    // Move the cursor to the right after inserting a character
                    position = position.translate(0, 1);
                    await this.delay(20); // Adjust the delay as needed
                }

                // Insert a newline character after each line (except the last one)
                if (line !== code.split('\n').slice(-1)[0]) {
                    const editSuccessful = await editor.edit(editBuilder => {
                        editBuilder.insert(position, '\n');
                    });

                    if (!editSuccessful) {
                        this.showErrorMessage('Failed to insert code into the editor.');
                        return;
                    }

                    // Move the cursor down to the next line
                    position = position.translate(1, -position.character);
                }
            }

            // Update the lastInsertedCodeRange with the correct range
            this.lastInsertedCodeRange = new vscode.Range(startPosition, position); // Set the range from start to end position
            console.log("Code inserted successfully with range:", this.lastInsertedCodeRange);
            await this.promptUserForFeedback(code);
        } else {
            this.showErrorMessage('No active editor is open.');
        }
    }

    // Prompt the user for feedback on the generated code
    private async promptUserForFeedback(generatedCode: string): Promise<void> {
        const response = await vscode.window.showInformationMessage(
            'Code has been generated. Do you want to accept, reject, or rephrase it?',
            { modal: true },
            'Accept', 'Reject', 'Rephrase'
        );

        switch (response) {
            case 'Accept':
                this.showInformationMessage('Code accepted.');
                break;
            case 'Reject':
                this.removeLastInsertedCode(); // Remove the last inserted code
                break;
            case 'Rephrase':
                await this.promptForCodeGeneration(true, generatedCode); // Rephrase with the old generated code as context
                break;
            default:
                this.showInformationMessage('No option selected.');
                break;
        }
    }

 
    // Utility method to introduce a delay
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

  

    // Utility method to display information messages
    private showInformationMessage(message: string): void {
        vscode.window.showInformationMessage(message);
    }

    // Utility method to display error messages
    private showErrorMessage(message: string): void {
        vscode.window.showErrorMessage(message);
    }

   
    // Create a WebviewPanel for customized user input with buttons
    private async getUserInput(placeHolder: string): Promise<string | undefined> {
        const panel = vscode.window.createWebviewPanel(
            'customInput',
            'Code Generator Input',
            vscode.ViewColumn.One,
            {
                enableScripts: true, // Enable JavaScript inside the webview
            }
        );

        // Define the HTML content for the webview
        panel.webview.html = this.getWebviewContent(placeHolder);

        // Create a promise that resolves when the input is provided
        return new Promise((resolve) => {
            panel.webview.onDidReceiveMessage(
                (message) => {
                    if (message.command === 'submit') {
                        resolve(message.text); // Resolve with the user input
                        panel.dispose(); // Close the panel after submission
                    } else if (message.command === 'cancel') {
                        resolve(undefined); // Resolve with no input
                        panel.dispose(); // Close the panel on cancel
                    }
                },
                undefined,
                [] // Disposables
            );
        });
    }


      // HTML for the webview
      private getWebviewContent(placeHolder: string): string {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Code Generator Input</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        padding: 10px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                    }
                    #inputBox {
                        width: 80%;
                        padding: 10px;
                        margin-bottom: 10px;
                        font-size: 14px;
                    }
                    #buttons {
                        display: flex;
                        justify-content: space-between;
                        width: 80%;
                    }
                    button {
                        padding: 8px 16px;
                        font-size: 14px;
                        cursor: pointer;
                    }
                    .accept {
                        background-color: #4CAF50;
                        color: white;
                        border: none;
                    }
                    .reject {
                        background-color: #f44336;
                        color: white;
                        border: none;
                    }
                    .rephrase {
                        background-color: #008CBA;
                        color: white;
                        border: none;
                    }
                </style>
            </head>
            <body>
                <h3>${placeHolder}</h3>
                <input type="text" id="inputBox" placeholder="${placeHolder}" />
                <div id="buttons">
                    <button class="accept" onclick="submitInput('accept')">Accept</button>
                    <button class="reject" onclick="submitInput('reject')">Reject</button>
                    <button class="rephrase" onclick="submitInput('rephrase')">Rephrase</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();

                    function submitInput(action) {
                        const inputValue = document.getElementById('inputBox').value;
                        vscode.postMessage({
                            command: 'submit',
                            text: inputValue,
                            action: action
                        });
                    }
                </script>
            </body>
            </html>
        `;
    }

    // Remove the last inserted code from the editor
    private removeLastInsertedCode(): void {
        const editor = vscode.window.activeTextEditor;

        if (editor && this.lastInsertedCodeRange) {
            editor.edit(editBuilder => {
                editBuilder.delete(this.lastInsertedCodeRange!);
            }).then(success => {
                if (success) {
                    this.showInformationMessage('Last inserted code removed.');
                    this.lastInsertedCodeRange = null; // Reset after removal
                } else {
                    this.showErrorMessage('Failed to remove last inserted code.');
                }
            }).catch(error => {
                this.showErrorMessage(`Error during code removal: ${error.message}`);
            });
        } else {
            if (!editor) {
                this.showErrorMessage('No active editor is open.');
            } else {
                this.showErrorMessage('No code to remove.');
            }
        }
    }
}

export default CodeGenerator;