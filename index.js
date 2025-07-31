// #!/usr/bin/env node

const net = require('node:net')
const process = require('process');

const TIMEOUT = 10000;

// Parse command line arguments
function parseArguments() {
  const args = process.argv.slice(2); // Remove 'node' and script name

  if (args.length < 3) {
    console.error('Usage: node index.js <ip_address> <subcommand> <argument>');
    console.error('Example: node index.js 192.168.3.100 fill-pattern 1024');
    process.exit(1);
  }

  return {
    ipAddress: args[0],
    subcommand: args[1],
    argument: args[2]
  };
}

// Validate IP address format (basic validation)
function isValidIP(ip) {
  const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipRegex.test(ip)) return false;

  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

// Handle different subcommands
function handleSubcommand(ipAddress, subcommand, argument) {
  console.log(`Target IP: ${ipAddress}`);
  console.log(`Subcommand: ${subcommand}`);
  console.log(`Argument: ${argument}`);

  switch (subcommand) {
    case 'fill-pattern':
      handleFillPattern(ipAddress, argument);
      break;

    // Add more subcommands here as needed
    case 'another-command':
      handleAnotherCommand(ipAddress, argument);
      break;

    default:
      console.error(`Unknown subcommand: ${subcommand}`);
      console.error('Available subcommands: fill-pattern');
      process.exit(1);
  }
}

// Handle fill-pattern subcommand
function handleFillPattern(ipAddress, sizeArg) {
  const size = parseInt(sizeArg, 10);
  let received = 0
  let timer;
  let connectTime = 0;
  let firstArrival = 0;
  let lastArrival = 0;

  if (isNaN(size) || size <= 0) {
    console.error('Invalid size argument. Must be a positive number.');
    process.exit(1);
  }

  console.log(`Executing fill-pattern on ${ipAddress} with size ${size}`);

  const client = net.createConnection({
    port: 7332,
    host: ipAddress,
    allowHalfOpen: true
  });

  const timeout = () => {
    console.log('connection timeout');
    client.destroy();
    process.exit(1);
  }

  client.on('connect', () => {
    console.log('connected');

    connectTime = Date.now();

    const buffer = Buffer.from([
      0xA5, 0xA5, 0xA5, 0xA5,   // preamble
      0xff,                     // type
      0x01, 0x00, 0x00,         // test command
      0x08, 0x00, 0x00, 0x00,   // payload size
      0x01, 0x00, 0x00, 0x00,   // count
      0x00, 0x00, 0x00, 0x00,   // pattern
      0x00, 0x00, 0x00, 0x00    // crc32
    ])

    buffer.writeUInt32LE(size, 12);
    buffer.writeUInt32LE(0xdeadbeef, 16);

    client.write(buffer, () => {
      console.log('data written', buffer)
    })

    timer = setTimeout(timeout, TIMEOUT);
  })

  client.on('data', data => {
    clearTimeout(timer);

    if (firstArrival === 0) {
      firstArrival = Date.now();
      lastArrival = Date.now();
    } else {
      lastArrival = Date.now();
    }

    received += data.length;
    if (received >= size * 4) {
      client.destroy();

      const total_time = (lastArrival - connectTime) / 1000;
      const recv_time = (lastArrival - firstArrival) / 1000;

      console.log(`total time used: ${total_time.toFixed(2)} sec`);
      console.log(`receiving time used: ${recv_time.toFixed(2)} sec`);

      if (lastArrival > firstArrival) {
        const bandwidth = received / recv_time;
        console.log(`receiving bandwidth: ${bandwidth.toFixed(2)} bytes / sec`)
      }

      process.exit();
    } else {
      timer = setTimeout(timeout, TIMEOUT);
    }
  })

  client.on('error', err => {
    console.error('connection error:', err);
    client.end(() => {
      process.exit(1);
    })
  })

  client.on('close', () => {
    console.log('connection closed');
  })
}

// Placeholder for additional subcommands
function handleAnotherCommand(ipAddress, argument) {
  console.log(`Executing another-command on ${ipAddress} with argument ${argument}`);
  // TODO: Implement logic for other subcommands
}

// Main function
function main() {
  try {
    const { ipAddress, subcommand, argument } = parseArguments();

    // Validate IP address
    if (!isValidIP(ipAddress)) {
      console.error(`Invalid IP address: ${ipAddress}`);
      process.exit(1);
    }

    // Handle the subcommand
    handleSubcommand(ipAddress, subcommand, argument);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the program
if (require.main === module) {
  main();
}

module.exports = {
  parseArguments,
  isValidIP,
  handleSubcommand,
  handleFillPattern
};
