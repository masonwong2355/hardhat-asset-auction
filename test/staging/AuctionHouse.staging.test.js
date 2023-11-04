const { assert, expect } = require("chai")
const { getNamedAccounts, ethers, network } = require("hardhat")

const { developmentChains } = require("../../helper-hardhat-config")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Auction House Staging Tests", function () {
          let auctionNft, auctionHouse, guardian, guardianAddress, user1, user2, tokenId
          const tokenURI = "https://example.com/token/123"
          const price = ethers.utils.parseEther("0.01") // 0.01 ETH
          const startAt = Math.floor(Date.now() / 1000) + 120 // 1 minute from now
          const endAt = startAt + 3600 * 5 // 5 hour from startAt

          beforeEach(async function () {
              accounts = await ethers.getSigners()
              guardian = accounts[0]
              guardianAddress = guardian.address
              user1 = accounts[1]
              user2 = accounts[2]

              auctionHouse = await ethers.getContract("AuctionHouse")
              auctionNft = await ethers.getContract("AuctionNFT")

              //   console.log("start setAuction Nft ...")

              //   const setAuctioNft_tx = await auctionHouse.setAuctionNft(auctionNft.address)
              //   await setAuctioNft_tx.wait(1)

              //   console.log("start applyGuardian Nft ...")
              //   stackAmount = ethers.utils.parseEther("0.0001")
              //   const applyGuardianTx = await auctionHouse.applyGuardian("GoodGuardian", "US", {
              //       value: stackAmount,
              //   })
              //   await applyGuardianTx.wait(1)

              //   console.log("start minting ...")
              //   const tx = await auctionNft.mint(user1.address, tokenURI)
              //   const receipt = await tx.wait(1)
              //   tokenId = receipt.events[2].args.tokenId
              //   console.log("tokenId: ", tokenId)
              tokenId = 2
          })

          describe("performUpkeep", function () {
              beforeEach(async () => {
                  //   console.log("start listing...")
                  //   const listAssertTx = await auctionHouse
                  //       .connect(user1)
                  //       .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  //   await listAssertTx.wait(1)
              })

              it("works with live Chainlink Keepers will set listing to Selling", async function () {
                  // enter the raffle
                  console.log("Setting up test...")

                  //   1694619350
                  //   1694534400000
                  console.log((await ethers.provider.getBlock("latest")).timestamp)

                  console.log("Setting up Listener...")
                  await new Promise(async (resolve, reject) => {
                      // setup listener before we enter the raffle
                      // Just in case the blockchain moves REALLY fast
                      auctionHouse.once("ListingSell", async () => {
                          console.log("ListingSell event fired!")
                          try {
                              const listing = await auctionHouse.s_listings(tokenId)
                              expect(listing.status).to.equal(2)

                              resolve()
                          } catch (error) {
                              console.log(error)
                              reject(error)
                          }
                      })
                      // Then entering the raffle
                      console.log(startAt, endAt)

                      let performData = await auctionHouse.checkUpkeep("0x")
                      console.log("Perform data: ", performData)

                      //   console.log()
                      const listing = await auctionHouse.s_listings(tokenId)
                      console.log("Listing: ", listing)
                      console.log("Listing start At: ", listing.startAt.toNumber())
                      console.log("Listing end At: ", listing.endAt.toNumber())

                      //   console.log(performData[1])
                      //   let perforTx = await auctionHouse.performData(performData[1])
                      //   let receipt = await perforTx.wait(1)
                      //   console.log("Perform tx: ", receipt)

                      console.log("Ok, time to wait...")

                      // and this code WONT complete until our listener has finished listening!
                  })
              })
          })
      })
