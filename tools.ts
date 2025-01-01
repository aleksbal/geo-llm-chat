import ollama from 'ollama';
import axios from 'axios'; // Include axios for making HTTP requests
import { FeatureCollection, GeoJSON } from 'geojson';

// Add two numbers function (tool)
function addTwoNumbers(args: { a: number, b: number }): number {
    return args.a + args.b;
}

// Subtract two numbers function (tool)
function subtractTwoNumbers(args: { a: number, b: number }): number {
    return args.a - args.b;
}

// HTTP GET Call (local running service) to get GeoJSON data
async function geoJson(args: { name: string }): Promise<FeatureCollection> {
    try {
        // Make a GET request to the local service
        const response = await axios.get(`http://localhost:3020/api/search`, {
            params: { name: args.name },
        });

        // Validate and return the GeoJSON feature collection
        if (response.data && response.data.type === 'FeatureCollection') {
            return response.data as FeatureCollection;
        } else {
            throw new Error('Invalid GeoJSON data received from the server');
        }
    } catch (error) {
        console.error('Error fetching geospatial data:', error);
        throw new Error('Failed to fetch geospatial data');
    }
}

// Tool definition for add function
const addTwoNumbersTool = {
    type: 'function',
    function: {
        name: 'addTwoNumbers',
        description: 'Add two numbers together',
        parameters: {
            type: 'object',
            required: ['a', 'b'],
            properties: {
                a: { type: 'number', description: 'The first number' },
                b: { type: 'number', description: 'The second number' }
            }
        }
    }
};

// Tool definition for subtract function
const subtractTwoNumbersTool = {
    type: 'function',
    function: {
        name: 'subtractTwoNumbers',
        description: 'Subtract two numbers',
        parameters: {
            type: 'object',
            required: ['a', 'b'],
            properties: {
                a: { type: 'number', description: 'The first number' },
                b: { type: 'number', description: 'The second number' }
            }
        }
    }
};

// Tool definition to get geospatial location data for a given name
const geoJsonTool = {
    type: 'function',
    function: {
        name: 'geoJson',
        description: 'Tool definition to get geospatial location data for a given name',
        parameters: {
            type: 'object',
            required: ['name'],
            properties: {
                name: { type: 'string', description: 'Name of geospatial location such as city, mountain, river' }
            }
        }
    }
};

async function run(model: string) {
    const messages = [{ role: 'user', content: 'What is three minus one?' }];
    console.log('Prompt:', messages[0].content);

    // Define the available functions using a Map
    const availableFunctions = new Map<string, (args: any) => any>([
        ['addTwoNumbers', addTwoNumbers],
        ['subtractTwoNumbers', subtractTwoNumbers],
        ['geoJson', geoJson]
    ]);

    const response = await ollama.chat({
        model: model,
        messages: messages,
        tools: [addTwoNumbersTool, subtractTwoNumbersTool, geoJsonTool]
    });

    let output: number;
    if (response.message.tool_calls) {
        // Process tool calls from the response
        for (const tool of response.message.tool_calls) {
            
            const functionToCall = availableFunctions.get(tool.function.name);
            if (functionToCall) {
                console.log('Calling function:', tool.function.name);
                console.log('Arguments:', tool.function.arguments);
                output = await functionToCall(tool.function.arguments);
                console.log('Function output:', output);

                // Add the function response to messages for the model to use
                messages.push(response.message);
                messages.push({
                    role: 'tool',
                    content: output.toString(),
                });
            } else {
                console.log('Function', tool.function.name, 'not found');
            }
        }

        // Get final response from model with function outputs
        const finalResponse = await ollama.chat({
            model: model,
            messages: messages
        });
        console.log('Final response:', finalResponse.message.content);
    } else {
        console.log('No tool calls returned from model');
    }
}

run('llama3.2').catch(error => console.error("An error occurred:", error));