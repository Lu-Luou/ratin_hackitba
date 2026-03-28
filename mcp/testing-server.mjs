import { exec } from "node:child_process";

const SERVER_INFO = {
  name: "local-testing-server",
  version: "1.0.0",
};

const TOOLS = [
  {
    name: "run_tests",
    description: "Run project tests using npm test or a custom command.",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string" },
      },
      additionalProperties: false,
    },
  },
];

const defaultCommand = process.env.TEST_COMMAND || "npm test --if-present";

function runCommand(command) {
  return new Promise((resolve) => {
    exec(command, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      const output = [stdout, stderr].filter(Boolean).join("\n").trim();
      resolve({
        success: !error,
        command,
        output,
        exitCode: typeof error?.code === "number" ? error.code : 0,
      });
    });
  });
}

function toArguments(args) {
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return {};
    }
  }
  return args && typeof args === "object" ? args : {};
}

async function callTool(name, args) {
  if (name !== "run_tests") {
    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  }

  const parsed = toArguments(args);
  const command = typeof parsed.command === "string" && parsed.command.trim()
    ? parsed.command.trim()
    : defaultCommand;

  const result = await runCommand(command);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    structuredContent: result,
    isError: !result.success,
  };
}

function writeMessage(message) {
  const body = JSON.stringify(message);
  const headers = `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n`;
  process.stdout.write(headers + body);
}

function writeError(id, code, message) {
  writeMessage({ jsonrpc: "2.0", id, error: { code, message } });
}

async function handleRequest(msg) {
  const { id, method, params } = msg;

  if (method === "initialize") {
    writeMessage({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: typeof params?.protocolVersion === "string" ? params.protocolVersion : "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      },
    });
    return;
  }

  if (method === "tools/list") {
    writeMessage({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    return;
  }

  if (method === "tools/call") {
    const result = await callTool(params?.name, params?.arguments);
    writeMessage({ jsonrpc: "2.0", id, result });
    return;
  }

  writeError(id ?? null, -32601, `Method not found: ${method}`);
}

let buffer = Buffer.alloc(0);

process.stdin.on("data", (chunk) => {
  buffer = Buffer.concat([buffer, chunk]);

  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      return;
    }

    const header = buffer.slice(0, headerEnd).toString("utf8");
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = Number(match[1]);
    const messageEnd = headerEnd + 4 + contentLength;
    if (buffer.length < messageEnd) {
      return;
    }

    const payload = buffer.slice(headerEnd + 4, messageEnd).toString("utf8");
    buffer = buffer.slice(messageEnd);

    let message;
    try {
      message = JSON.parse(payload);
    } catch {
      writeError(null, -32700, "Parse error");
      continue;
    }

    if (message?.id === undefined || typeof message?.method !== "string") {
      continue;
    }

    handleRequest(message).catch((error) => {
      const msg = error instanceof Error ? error.message : "Internal error";
      writeError(message.id, -32603, msg);
    });
  }
});