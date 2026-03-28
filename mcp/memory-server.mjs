import fs from "node:fs/promises";
import path from "node:path";

const SERVER_INFO = {
  name: "local-memory-server",
  version: "1.0.0",
};

const TOOLS = [
  {
    name: "store_memory",
    description: "Store a memory note in local JSON storage.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string" },
      },
      required: ["content"],
      additionalProperties: false,
    },
  },
  {
    name: "search_memory",
    description: "Search memory notes by text query.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string" },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

const memoryFile = process.env.MEMORY_FILE
  ? path.resolve(process.env.MEMORY_FILE)
  : path.resolve(process.cwd(), "mcp", "memory.json");

async function loadMemory() {
  try {
    const raw = await fs.readFile(memoryFile, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveMemory(data) {
  await fs.mkdir(path.dirname(memoryFile), { recursive: true });
  await fs.writeFile(memoryFile, JSON.stringify(data, null, 2), "utf8");
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
  const parsed = toArguments(args);

  if (name === "store_memory") {
    const content = typeof parsed.content === "string" ? parsed.content.trim() : "";
    if (!content) {
      return {
        isError: true,
        content: [{ type: "text", text: "Invalid input: content is required." }],
      };
    }

    const data = await loadMemory();
    data.push({ content, date: new Date().toISOString() });
    await saveMemory(data);

    return {
      content: [{ type: "text", text: "Memory saved." }],
    };
  }

  if (name === "search_memory") {
    const query = typeof parsed.query === "string" ? parsed.query.trim() : "";
    if (!query) {
      return {
        isError: true,
        content: [{ type: "text", text: "Invalid input: query is required." }],
      };
    }

    const data = await loadMemory();
    const lower = query.toLowerCase();
    const matches = data.filter(
      (item) => typeof item?.content === "string" && item.content.toLowerCase().includes(lower)
    );

    if (matches.length === 0) {
      return {
        content: [{ type: "text", text: "No matches found." }],
      };
    }

    return {
      content: [{ type: "text", text: JSON.stringify(matches, null, 2) }],
    };
  }

  return {
    isError: true,
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
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