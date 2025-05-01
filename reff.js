
import fs from 'fs/promises';
import axios from 'axios';
import HttpsProxyAgent from 'https-proxy-agent';
import chalk from 'chalk';
import { Wallet } from 'ethers';
import cfonts from 'cfonts';
import inquirer from 'inquirer';

function centerText(text, color = 'blueBright') {
  const terminalWidth = process.stdout.columns || 80;
  const textLength = text.length;
  const padding = Math.max(0, Math.floor((terminalWidth - textLength) / 2));
  return ' '.repeat(padding) + chalk[color](text);
}

const baseHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Content-Type': 'application/json',
  'Referer': 'https://stobix.com/',
  'Origin': 'https://stobix.com'
};

function createAxiosInstance(proxy) {
  const agent = proxy ? new HttpsProxyAgent(`http://${proxy}`) : undefined;
  return axios.create({
    headers: baseHeaders,
    httpsAgent: agent,
    proxy: false,
  });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function countdown(seconds) {
  while (seconds > 0) {
    process.stdout.write(`\rWaiting ${seconds--} seconds...`);
    await delay(1000);
  }
  process.stdout.write('\r                          \r');
}

async function readProxies() {
  try {
    const data = await fs.readFile('proxy.txt', 'utf-8');
    return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  } catch (error) {
    console.error(chalk.red(`Error reading proxy.txt: ${error.message}`));
    return [];
  }
}

async function visitInvitePage(axiosInstance, refCode) {
  await axiosInstance.get(`https://api.stobix.com/api/invite/${refCode}`);
}

async function authenticateWallet(axiosInstance, walletAddress, privateKey) {
  const response = await axiosInstance.post('https://api.stobix.com/api/wallet/auth', {
    address: walletAddress,
    sign: privateKey
  });
  return response.data.token;
}

async function completeTasks(axiosInstance, walletAddress, token) {
  const headers = { Authorization: `Bearer ${token}` };
  await axiosInstance.post('https://api.stobix.com/api/tasks/complete', {
    address: walletAddress,
    taskId: 'official_telegram',
  }, { headers });
}

async function startMining(axiosInstance, token) {
  const headers = { Authorization: `Bearer ${token}` };
  await axiosInstance.post('https://api.stobix.com/api/mining/start', {}, { headers });
}

async function getUserPoints(axiosInstance, token) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await axiosInstance.get('https://api.stobix.com/api/user/me', { headers });
  console.log(chalk.green(`Points: ${res.data.user.points}`));
}

async function main() {
  cfonts.say('FORESTARMY', {
    font: 'block',
    align: 'center',
    colors: ['cyan', 'black'],
  });
  console.log(centerText("=== Telegram Channel : Forest Army (@forestarmy) ==="));
  console.log(centerText("  STOBIX AUTO REFF + RUN NODE  \n"));

  console.log(chalk.yellow('============ Auto Registration Bot ===========\n'));

  let { useProxy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'useProxy',
      message: 'Do you want to use a proxy?',
      default: false,
    }
  ]);

  let proxyList = [];
  let proxyMode = null;
  if (useProxy) {
    const proxyAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'proxyType',
        message: 'Choose proxy type:',
        choices: ['Rotating', 'Static'],
      }
    ]);
    proxyMode = proxyAnswer.proxyType;
    proxyList = await readProxies();
    if (proxyList.length > 0) {
      console.log(chalk.blueBright(`Found ${proxyList.length} proxies.\n`));
      if (proxyMode === 'Rotating') {
        console.log(chalk.redBright('WARNING: You are using rotating proxies. Make sure your proxy supports sticky sessions.'));
        console.log(chalk.yellow('- Login to your proxy provider dashboard.'));
        console.log(chalk.yellow('- Enable sticky sessions or use static proxies.'));
        const { confirmSticky } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmSticky',
            message: 'Is your proxy set up with sticky sessions?',
            default: false,
          }
        ]);
        if (!confirmSticky) {
          console.log(chalk.yellow('Continuing without sticky session setup may result in failed referrals.\n'));
        }
      }
    } else {
      console.log(chalk.yellow('proxy.txt file is missing or empty. Proceeding without proxy.\n'));
      useProxy = false;
    }
  }

  let count;
  while (true) {
    const answer = await inquirer.prompt([
      {
        type: 'input',
        name: 'count',
        message: 'Enter number of accounts to create: ',
        validate: (value) => {
          const parsed = parseInt(value, 10);
          if (isNaN(parsed) || parsed <= 0) {
            return 'Please enter a valid number greater than 0!';
          }
          return true;
        }
      }
    ]);
    count = parseInt(answer.count, 10);
    if (count > 0) break;
  }

  const { ref } = await inquirer.prompt([
    {
      type: 'input',
      name: 'ref',
      message: 'Enter your referral code: ',
    }
  ]);

  console.log(chalk.yellow('\n==================================='));
  console.log(chalk.yellowBright(`Creating ${count} accounts ..`));
  console.log(chalk.yellowBright('Note: Donâ€™t go crazy ðŸ—¿'));
  console.log(chalk.yellowBright('Tip: If you want to go fast, use proxies..'));
  console.log(chalk.yellow('=====================================\n'));

  const fileName = 'accounts.json';
  let accounts = [];
  try {
    const data = await fs.readFile(fileName, 'utf-8');
    accounts = JSON.parse(data);
  } catch (err) {
    accounts = [];
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < count; i++) {
    console.log(chalk.cyanBright(`\n================ ACCOUNT ${i + 1}/${count} ================`));

    let proxy = null;
    if (useProxy && proxyList.length > 0) {
      proxy = proxyList[i % proxyList.length];
      console.log(chalk.white(`Using proxy: ${proxy}`));
    }

    const axiosInstance = createAxiosInstance(proxy);
    const wallet = Wallet.createRandom();
    const walletAddress = wallet.address;
    const privateKey = wallet.privateKey.startsWith('0x') ? wallet.privateKey.slice(2) : wallet.privateKey;

    console.log(chalk.greenBright(`âœ”ï¸ Ethereum wallet created: ${walletAddress}`));

    try {
      await visitInvitePage(axiosInstance, ref);
      const token = await authenticateWallet(axiosInstance, walletAddress, wallet.privateKey);
      await completeTasks(axiosInstance, walletAddress, token);
      await startMining(axiosInstance, token);
      await getUserPoints(axiosInstance, token);

      accounts.push({
        walletAddress: walletAddress,
        privateKey: privateKey,
      });
      await fs.writeFile(fileName, JSON.stringify(accounts, null, 2));
      console.log(chalk.greenBright('âœ”ï¸ Account data saved to accounts.json'));
      successCount++;
    } catch (error) {
      console.log(chalk.red(`âœ– Failed for ${walletAddress}: ${error.message}`));
      failCount++;
    }

    console.log(chalk.yellow(`\nProgress: ${i + 1}/${count} accounts processed...`));
  }

  console.log(chalk.greenBright(`\nSuccessfully created: ${successCount} account(s)`));
  console.log(chalk.redBright(`Failed to create: ${failCount} account(s)`));
}

main();
