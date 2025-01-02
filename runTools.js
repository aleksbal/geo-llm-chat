import ollama from 'ollama';
import axios from 'axios';

function addTwoNumbers(args) {
    return args.a + args.b;
}

function subtractTwoNumbers(args) {
    return args.a - args.b;
}

async function geoJson(args) {
    const response = await axios.get(`http://localhost:3020/api/search`, {
        params: { name: args.name },
    });

    console.log('Fetching geospaltial info for: ', args.name);

    if (response.data && response.data.type === 'FeatureCollection') {
        console.log('GeoJson response: ', response.data);
        return response.data;
    }
    throw new Error('Invalid GeoJSON data received from the server');
}

const tools = [
    {
        metadata: {
            type: 'function',
            function: {
                name: 'addTwoNumbers',
                description: 'Add two numbers together',
                parameters: {
                    type: 'object',
                    required: ['a', 'b'],
                    properties: {
                        a: { type: 'number', description: 'The first number' },
                        b: { type: 'number', description: 'The second number' },
                    },
                },
            },
        },
        implementation: addTwoNumbers,
    },
    {
        metadata: {
            type: 'function',
            function: {
                name: 'subtractTwoNumbers',
                description: 'Subtract one number from another',
                parameters: {
                    type: 'object',
                    required: ['a', 'b'],
                    properties: {
                        a: { type: 'number', description: 'The first number' },
                        b: { type: 'number', description: 'The second number' },
                    },
                },
            },
        },
        implementation: subtractTwoNumbers,
    },
    {
        metadata: {
            type: 'function',
            function: {
                name: 'geoJson',
                description: 'Fetch the GeoJSON representation of a geospatial location',
                parameters: {
                    type: 'string',
                    required: ['name'],
                    properties: {
                        name: { type: 'string', description: 'The name of the geospatial location' },
                    },
                },
            },
        },
        implementation: geoJson,
    },
];

const availableFunctions = new Map(
    tools.map((tool) => [tool.metadata.function.name, tool.implementation]),
);

async function processToolCalls(toolCalls, messages) {
    for (const tool of toolCalls) {
        const functionToCall = availableFunctions.get(tool.function.name);
        if (functionToCall) {
            console.log('Calling tool/function:', tool.function.name);
            const output = await functionToCall(tool.function.arguments);
            console.log('Result:', output.toString());
            messages.push({
                role: 'tool',
                content: output.toString(),
            });
        }
    }
    return messages;
}

async function run(model) {
    const initialMessages = [
        { role: 'system', content: 'You are an assistant with access to tools, if you do not have a tool to deal with the users request but you think you can answer do it so, if not explain your capabilities' },
        { role: 'user', content: 'Where are located the capitals of France and the UK?' },
    ];

    const response = await ollama.chat({
        model,
        messages: initialMessages,
        tools: tools.map(({ metadata }) => metadata),
    });

    console.log('First quick response:', response.message.content);

    if (response.message.tool_calls) {
        const updatedMessages = await processToolCalls(
            response.message.tool_calls,
            [...initialMessages],
        );

        // update mssages now contains tool calls, do we need to instructi the LLM to process the tool calls?
        updatedMessages.push({
            role: 'user',
            content: 'Use the data from te context and answer with detailed geospatial info (GeoJSON): where are located the capitals of France and the UK?',
        });

        const finalResponse = await ollama.chat({
            model,
            messages: updatedMessages,
        });

        console.log('Final response:', finalResponse.message.content);
    } else {
        console.log('No tool calls returned from the model');
    }
}

run('llama3.2').catch((error) => console.error('An error occurred:', error));
