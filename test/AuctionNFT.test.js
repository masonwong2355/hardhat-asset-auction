const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("AuctionNFT Unit Tests", async function () {
          let auctionNft, auctionHouse, guardian, user1
          const tokenURI = "https://example.com/token/123"

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              guardian = accounts[0]
              user1 = accounts[1]

              await deployments.fixture(["auctionHouse", "auctionNft"])

              auctionHouse = await ethers.getContract("AuctionHouse")
              auctionNft = await ethers.getContract("AuctionNFT")

              stackAmount = ethers.utils.parseEther("2")
              const applyGuardianTx = await auctionHouse.applyGuardian("GoodGuardian", "US", {
                  value: stackAmount,
              })
              await applyGuardianTx.wait(1)
              const tx = await auctionHouse.setAuctionNft(auctionNft.address)
              await tx.wait(1)
          })

          describe("contractor", async () => {
              it("init AuctionNFT correctly", async () => {
                  assert.equal(await auctionNft.s_tokenCounter(), 0)
              })
          })

          describe("mint", async () => {
              it("when not call by guardian", async () => {
                  const auctionNft_user1 = auctionNft.connect(user1)
                  await expect(
                      auctionNft_user1.mint(guardian.address, tokenURI)
                  ).to.be.revertedWith("requirde guardian")
              })

              it("success mint Nft", async () => {
                  const tx = await auctionNft.mint(user1.address, tokenURI)
                  const receipt = await tx.wait(1)
                  const tokenId = receipt.events[2].args.tokenId

                  assert.equal(receipt.events[2].event, "Minted")
                  assert.equal(await auctionNft.s_tokenCounter(), 1)
                  assert.equal(await auctionNft.ownerOf(tokenId), user1.address)
                  assert.equal(await auctionNft.tokenURI(tokenId), tokenURI)

                  assert.equal(await auctionHouse.assetInGuardian(guardian.address, tokenId), true)
              })
          })

          describe("burn", async () => {
              let tokenId

              beforeEach(async () => {
                  const tx = await auctionNft.mint(user1.address, tokenURI)
                  const receipt = await tx.wait(1)
                  tokenId = receipt.events[2].args.tokenId
              })

              it("when not call by guardian", async () => {
                  const auctionNft_user1 = auctionNft.connect(user1)
                  await expect(auctionNft_user1.burn(user1.address, tokenId)).to.be.revertedWith(
                      "requirde guardian"
                  )
              })

              it("when asset not in Guardian", async () => {
                  await expect(auctionNft.burn(user1.address, 2)).to.be.revertedWith(
                      "asset not in guardian"
                  )
              })

              it("success burn Nft", async () => {
                  const tx = await auctionNft.burn(user1.address, tokenId)
                  const receipt = await tx.wait(1)
                  const burnedTokenId = receipt.events[2].args.tokenId

                  assert.equal(receipt.events[2].event, "Burned")
                  assert.equal(await auctionNft.s_tokenCounter(), 0)
                  assert.equal(tokenId.toString(), burnedTokenId.toString())
              })
          })

          describe("breakBurn", async () => {
              let tokenId

              beforeEach(async () => {
                  const tx = await auctionNft.mint(user1.address, tokenURI)
                  const receipt = await tx.wait(1)
                  tokenId = receipt.events[2].args.tokenId
              })

              it("when not call by guardian", async () => {
                  const auctionNft_user1 = auctionNft.connect(user1)
                  await expect(
                      auctionNft_user1.breakBurn(user1.address, tokenId, 1000)
                  ).to.be.revertedWith("requirde guardian")
              })

              it("when asset not in Guardian", async () => {
                  await expect(auctionNft.breakBurn(user1.address, 2, 1000)).to.be.revertedWith(
                      "asset not in guardian"
                  )
              })

              it("when not enought fund to return", async () => {
                  const refundAmount = ethers.utils.parseEther("3")

                  await expect(
                      auctionNft.breakBurn(user1.address, tokenId, refundAmount)
                  ).to.be.revertedWith("Not enough Fund to return")
              })

              it("success breakBurn Nft", async () => {
                  const beforeStackingAmount = await auctionHouse.guardianStacking(guardian.address)
                  const refundAmount = 1000
                  const beforeUserBalnace = await user1.getBalance()

                  await new Promise(async (resolve, reject) => {
                      auctionHouse.once("ItemBreakRefund", async () => {
                          console.log("ItemBreakRefund event fired!")

                          try {
                              const afterStackingAmount = await auctionHouse.guardianStacking(
                                  guardian.address
                              )
                              const afterUserBalnace = await user1.getBalance()

                              assert.equal(
                                  afterStackingAmount.add(refundAmount).toString(),
                                  beforeStackingAmount.toString()
                              )
                              assert.equal(
                                  beforeUserBalnace.add(refundAmount).toString(),
                                  afterUserBalnace.toString()
                              )

                              resolve()
                          } catch (e) {
                              reject(e)
                          }
                      })

                      const tx = await auctionNft.breakBurn(user1.address, tokenId, refundAmount)
                      const receipt = await tx.wait(1)
                      const burnedTokenId = receipt.events[2].args.tokenId

                      assert.equal(receipt.events[3].event, "Burned")
                      assert.equal(await auctionNft.s_tokenCounter(), 0)
                      assert.equal(tokenId.toString(), burnedTokenId.toString())
                      console.log("waiting ItemBreakRefund event triggered . . .")
                  })
              })
          })
      })
