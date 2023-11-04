const { frontEndContractsFile, frontEndAbiLocation } = require("../helper-hardhat-config")
require("dotenv").config()
const fs = require("fs")
const { network } = require("hardhat")

module.exports = async ({ deployments, getNamedAccounts }) => {
    const { deploy, log } = deployments
    log(`----------------------------------------------------------------`)

    if (process.env.UPDATE_FRONT_END) {
        console.log("Writing to front end...")
        await updateContractAddresses()
        await updateAbi()
        console.log("Front end written!")
    }
}

async function updateAbi() {
    const auctionHouse = await ethers.getContract("AuctionHouse")
    fs.writeFileSync(
        `${frontEndAbiLocation}AuctionHouse.json`,
        auctionHouse.interface.format(ethers.utils.FormatTypes.json)
    )

    const auctionNft = await ethers.getContract("AuctionNFT")
    fs.writeFileSync(
        `${frontEndAbiLocation}AuctionNFT.json`,
        auctionNft.interface.format(ethers.utils.FormatTypes.json)
    )
}

async function updateContractAddresses() {
    const chainId = network.config.chainId.toString()
    const auctionHouse = await ethers.getContract("AuctionHouse")
    const auctionNft = await ethers.getContract("AuctionNFT")

    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["AuctionHouse"].includes(auctionHouse.address)) {
            contractAddresses[chainId]["AuctionHouse"].push(auctionHouse.address)
        }

        if (!contractAddresses[chainId]["AuctionNFT"].includes(auctionNft.address)) {
            contractAddresses[chainId]["AuctionNFT"].push(auctionNft.address)
        }
    } else {
        contractAddresses[chainId] = {
            AuctionHouse: [auctionHouse.address],
            AuctionNFT: [auctionNft.address],
        }
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}
module.exports.tags = ["all", "frontend"]
