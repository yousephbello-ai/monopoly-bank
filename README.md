# Monopoly Bank

A browser-based virtual bank for managing money during a Monopoly board game.

## Available now

- Dashboard with bank funds, player count, and combined player balances.
- Create player accounts with unique account IDs and starting balances.
- Pay players from the bank and collect money back into the bank.
- Transfer money between players.
- Record and review recent transactions.
- Remove player accounts and return their remaining balance to the bank.
- Export a JSON backup of the current game.
- Reset the game to its starting state.

## Run the app

Open [index.html](./index.html) in a modern web browser, or publish the repository using GitHub Pages. The app stores its game data in the browser's local storage on that device.

## Current limitations

- **Single-device mode is implemented.** Data is stored locally in the browser. It does not automatically appear on another phone or computer.
- **Multi-device synchronization is not yet connected.** Firebase integration, secure administrator sign-in, and database security rules still need to be configured.
- This first version is a practical game-night prototype. Test it with sample game data before relying on it for a full game.

## Planned next steps

1. Add secure administrator authentication.
2. Connect Firebase/Cloud Firestore for shared multi-device game data.
3. Add player sign-in so players can view their own balances.
4. Add approval controls and stronger transaction auditing.
5. Test deployment and synchronization across phones and computers.

## Technology

- HTML, CSS, and JavaScript.
- GitHub Pages for static hosting.
- Firebase / Cloud Firestore planned for shared game data.

## Important

Monopoly Bank is for fictional board-game money only. It is not a real bank, payment service, or financial product. Do not enter real banking credentials or sensitive financial information.
