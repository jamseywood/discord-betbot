const { Client, IntentsBitField } = require('discord.js');
const fs = require('fs');
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildMembers,
    ],
});

function readBets() {
    try {
        const data = fs.readFileSync('bets.json', 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return {};
    }
}


function writeBets(bets) {
    fs.writeFileSync('bets.json', JSON.stringify(bets, null, 2), 'utf8');
}


const token = 'please add your own token here';
const prefix = '!'; 

let bets = readBets();

// Load bets from JSON file on bot startup
try {
    const data = fs.readFileSync('src/bets.json', 'utf8');
    bets = JSON.parse(data);
} catch (err) {
    console.error('Error reading or parsing bets.json:', err);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'pay') {
        const user = message.mentions.users.first();
        if (!user) {
            message.reply('Please mention a valid user to record a payment.');
            return;
        }

        // Check if the payment amount is valid
        const amount = parseInt(args[1]);
        if (isNaN(amount) || amount <= 0) {
            message.reply('Please enter a valid payment amount.');
            return;
        }

        // Check if there's a description for the payment
        const description = args.slice(2).join(' ');
        if (!description) {
            message.reply('Please provide a description for the payment.');
            return;
        }

        // Update the payment tally for both the author and the mentioned user
        if (!bets[message.author.id]) {
            bets[message.author.id] = [];
        }

        if (!bets[user.id]) {
            bets[user.id] = [];
        }

        // Record timestamp
        const timestamp = new Date().toISOString();

        bets[message.author.id].push({ timestamp, amount: -amount, description, winner: winner.id, loser: message.author.id });

        // Calc authers balance
        const authorBalance = bets[message.author.id].reduce((total, bet) => total + bet.amount, 0);

        message.reply(`Loss recorded! ${message.author.username}'s total balance is now: $${authorBalance}. \n**Description:** ${description}, \n**Winner:** ${winner.username}, \n**Loser:** ${message.author.username}`);

        writeBets(bets);
    } else if (command === 'tally') {
        const userBets = bets[message.author.id] || [];

        if (userBets.length === 0) {
            message.reply('You have no recorded bets.');
            return;
        }

        const debtsOwedByAuthor = [];

        Object.entries(bets).forEach(([userId, userBets]) => {
            if (userId !== message.author.id) {
                const username = client.users.cache.get(userId).username;
                const netAmount = userBets.reduce((total, bet) => total + bet.amount, 0);

                if (netAmount < 0) {
                    debtsOwedByAuthor.push(`You owe **${username}**: $${Math.abs(netAmount)}`);
                }
            }
        });

        if (debtsOwedByAuthor.length === 0) {
            message.reply('You don\'t owe money to anyone.');
        } else {
            message.channel.send(`**Debts You Owe:**\n${debtsOwedByAuthor.join('\n')}`);
        }

        const authorBalance = userBets.reduce((total, bet) => total + bet.amount, 0);
        message.reply(`Your total balance: $${authorBalance}`);
    } else if (command === 'totalbets') {
        const totalBetsList = Object.entries(bets).map(([userId, userBets]) => {
            const username = client.users.cache.get(userId).username;
            const totalAmount = userBets.reduce((total, bet) => total + bet.amount, 0);

            const result = totalAmount >= 0 ? 'win' : 'loss';
            return `**${username}** - Total ${result} amount: $${Math.abs(totalAmount)}`;
        });

        if (totalBetsList.length === 0) {
            message.reply('No bets have been placed yet.');
        } else {
            message.channel.send(`**Total Bets for Each User:**\n${totalBetsList.join('\n')}`);
        }
    } else if (command === 'totalallbets') {
        const allBets = Object.values(bets).flat();
        const totalAllBets = allBets.reduce((total, bet) => total + bet.amount, 0);
        const totalBetsCount = allBets.length;

        if (totalAllBets === 0) {
            message.reply('No bets have been placed yet.');
        } else {
            message.channel.send(`Total of all bets placed: $${totalAllBets}\nNumber of bets placed: ${totalBetsCount}`);
        }
    } else if (command === 'balance') {
        const userBalanceList = Object.entries(bets).map(([userId, userBets]) => {
            const username = client.users.cache.get(userId).username;

            const totalWon = userBets.filter(bet => bet.amount > 0).reduce((total, bet) => total + bet.amount, 0);
            const totalLost = userBets.filter(bet => bet.amount < 0).reduce((total, bet) => total + bet.amount, 0);
            const overallBalance = userBets.reduce((total, bet) => total + bet.amount, 0);

            return `**${username}** - Total Won: $${totalWon}, Total Lost: $${Math.abs(totalLost)}, Overall Balance: $${overallBalance}`;
        });

        if (userBalanceList.length === 0) {
            message.reply('No bets have been placed yet.');
        } else {
            message.channel.send(`**Balance Overview:**\n${userBalanceList.join('\n')}`);
        }
    } else if (command === 'leaderboard') {
        const leaderboard = Object.entries(bets)
            .map(([userId, userBets]) => {
                const username = client.users.cache.get(userId).username;
                const overallBalance = userBets.reduce((total, bet) => total + bet.amount, 0);
                return { username, overallBalance };
            })
            .sort((a, b) => b.overallBalance - a.overallBalance);

        if (leaderboard.length === 0) {
            message.reply('No bets have been placed yet.');
        } else {
            const leaderboardText = leaderboard.map((entry, index) => `${index + 1}. ${entry.username} - Overall Balance: $${entry.overallBalance}`).join('\n');
            message.channel.send(`**Leaderboard:**\n${leaderboardText}`);
        }
    } else if (command === 'help') {
        const helpMessage = `
**Commands:**
- \`!pay @user amount description\`: Place a bet with a specified user, amount, and description. Example: \`!pay @JohnDoe 20 Pizza bet\`
- \`!tally\`: Check your total balance and debts. Example: \`!tally\`
- \`!listbets\`: List all bets placed by users.
- \`!totalbets\`: Show the total bet amount for each user and the overall total of all bets.
- \`!balance\`: Show each user their total amount won, lost, and overall balance.
- \`!leaderboard\`: Display a leaderboard of users based on their overall balances.
- \`!totalallbets\`: Show the total amount of all bets placed and the number of bets.
- \`!othertally @user\`: Check the total balance of another user. Example: \`!othertally @JohnDoe\`
- \`!help\`: Display this help message.
`;

        message.channel.send(helpMessage);
    } else if (command === 'othertally') {
        const user = message.mentions.users.first();
        if (!user) {
            message.reply('Please mention a valid user to check the tally.');
            return;
        }

        const userBets = bets[user.id] || [];
        const totalAmount = userBets.reduce((total, bet) => total + bet.amount, 0);

        const result = totalAmount >= 0 ? 'win' : 'loss';
        message.reply(`${user.username}'s total ${result} amount: $${Math.abs(totalAmount)}`);
    }

    
});

client.login(token);
