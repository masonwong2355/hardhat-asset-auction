const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")

const minStackingValue = ethers.utils.parseEther("0.0001")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Guardian Unit Tests", async function () {
          let auctionNft, auctionHouse, guardian, user1
          const tokenURI = "https://example.com/token/123"

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              guardian = accounts[0]
              user1 = accounts[1]

              await deployments.fixture(["auctionHouse", "auctionNft"])

              auctionHouse = await ethers.getContract("AuctionHouse")
              auctionNft = await ethers.getContract("AuctionNFT")

              const tx = await auctionHouse.setAuctionNft(auctionNft.address)
              await tx.wait(1)
          })

          describe("contractor", async () => {
              it("init Guardians correctly", async () => {
                  assert.equal(
                      (await auctionHouse.s_minStackingValue()).toString(),
                      minStackingValue.toString()
                  )
              })
          })

          describe("applyGuardian", async () => {
              it("when not enough stacking price", async () => {
                  const stackingAmount = ethers.utils.parseEther("0.00001")
                  await expect(
                      auctionHouse.applyGuardian("GoodGuardian", "US", {
                          value: stackingAmount,
                      })
                  ).to.be.revertedWith("Not enought to staking")
              })

              it("success apply a guradian", async () => {
                  const tx = await auctionHouse.applyGuardian("GoodGuardian", "US", {
                      value: minStackingValue,
                  })
                  const receipt = await tx.wait(1)
                  const event = receipt.events[0]

                  assert.equal(await auctionHouse.isGuardians(guardian.address), true)
                  assert.equal(event.event, "GuardianAdded")
                  assert.equal(event.args.guardian, guardian.address)
              })
          })

          describe("addItems", async () => {
              beforeEach(async () => {
                  const tx = await auctionHouse.applyGuardian("GoodGuardian", "US", {
                      value: minStackingValue,
                  })
                  await tx.wait(1)
              })

              it("when call function not form auctionNFT contract", async () => {
                  await expect(auctionHouse.addItems(guardian.address, 1)).to.be.revertedWith(
                      "only able call by AuctionNFT"
                  )
              })

              it("success add items", async () => {
                  let tokenId

                  await new Promise(async (resolve, reject) => {
                      auctionHouse.once("ItemAdded", async () => {
                          console.log("ItemAdded event fired!")

                          try {
                              assert.equal(
                                  await auctionHouse.assetInGuardian(guardian.address, tokenId),
                                  true
                              )
                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      const tx = await auctionNft.mint(user1.address, tokenURI)
                      const receipt = await tx.wait(1)
                      tokenId = receipt.events[2].args.tokenId

                      assert.equal(receipt.events[2].event, "Minted")
                      console.log("waiting ItemAdded event triggered . . .")
                  })
              })
          })
      })

// Deploy to Mumbai
// 1. run script to deploy -> hh deploy --network mumbai
// 2. run test -> hh test --network mumbai
//   2.1 -> hh test test
//   2.2 -> hh test --network mumbai
// 3. update graph address
//   3.3 create new subgraph -> graph init --studio auction-house
//   3.4 update subgraph.yaml
//   3.5 update schema.graphql
//   3.5 check auction_house_v2/src
// 4. check front end contract address
