// const { network } = require("hardhat")
// const { moveBlocks } = require("../utils/move-blocks")

const stacking = ethers.utils.parseEther("0.01")

async function applyGuardian() {
    const accounts = await ethers.getSigners()
    const deployer = accounts[0]
    const auctionHouse = await ethers.getContract("AuctionHouse", deployer)
    const result = await auctionHouse.isGuardians(deployer.address)
    console.log(result)
    console.log(`done checked Guardian with : ${deployer.address}`)
}

applyGuardian()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
