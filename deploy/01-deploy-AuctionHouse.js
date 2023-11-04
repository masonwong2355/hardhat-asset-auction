const { verify } = require("../utils/verify")
const { networkConfig, developmentChains } = require("../helper-hardhat-config")
const { network } = require("hardhat")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deployer } = await getNamedAccounts()
    const { deploy, log } = deployments
    const chainId = network.config.chainId

    const minStackingValue = networkConfig[chainId]["minStackingValue"]

    log(`----------------------------------------------------------------`)
    const args = [minStackingValue]
    const auctionNft = await deploy("AuctionHouse", {
        from: deployer,
        log: true,
        args: args,
        waitingConfirmation: 1,
    })
    log(`success deploy AuctionHouse with ${auctionNft.address}`)

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying")
        await verify(auctionNft.address, args)
    }

    log(`----------------------------------------------------------------`)
}

module.exports.tags = ["all", "auctionHouse"]
