const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { deployments, ethers } = require("hardhat")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("AuctionHouse Unit Tests", async function () {
          let auctionNft, auctionHouse, guardian, guardianAddress, user1, user2, tokenId
          const tokenURI = "https://example.com/token/123"
          const price = ethers.utils.parseEther("0.01") // 0.01 ETH
          const startAt = Math.floor(Date.now() / 1000) + 120 // 2 minute from now
          const endAt = startAt + 3600 * 5 // 5 hour from startAt

          beforeEach(async () => {
              accounts = await ethers.getSigners()
              guardian = accounts[0]
              guardianAddress = guardian.address
              user1 = accounts[1]
              user2 = accounts[2]

              await deployments.fixture(["auctionHouse", "auctionNft"])

              auctionHouse = await ethers.getContract("AuctionHouse")
              auctionNft = await ethers.getContract("AuctionNFT")

              stackAmount = ethers.utils.parseEther("2")
              const applyGuardianTx = await auctionHouse.applyGuardian("GoodGuardian", "US", {
                  value: stackAmount,
              })
              await applyGuardianTx.wait(1)
              const setAuctioNft_tx = await auctionHouse.setAuctionNft(auctionNft.address)
              await setAuctioNft_tx.wait(1)

              const tx = await auctionNft.mint(user1.address, tokenURI)
              const receipt = await tx.wait(1)
              tokenId = receipt.events[2].args.tokenId
          })

          describe("contractor", async () => {
              it("init AuctionNFT correctly", async () => {
                  assert.equal(await auctionHouse.MINBIDINTERVAL(), 14400)
              })
          })

          describe("listAssert", async () => {
              it("should list an NFT for auction", async function () {
                  const tx = await auctionHouse
                      .connect(user1)
                      .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  const receipt = await tx.wait(1)

                  const listing = await auctionHouse.s_listings(tokenId)
                  expect(listing.seller).to.equal(user1.address)
                  expect(listing.price).to.equal(price)
                  expect(listing.netPrice).to.equal(price)
                  expect(listing.status).to.equal(1)
                  expect(listing.startAt).to.equal(startAt)
                  expect(listing.endAt).to.equal(endAt)

                  assert.equal(
                      (await auctionHouse.s_listingsCounter(0)).toString(),
                      tokenId.toString()
                  )
                  expect(receipt.events[0].event).to.equal("AssertListed")
                  expect(receipt.events[0].args.seller).to.equal(user1.address)
              })

              it("should revert when item is already listed", async function () {
                  await auctionHouse
                      .connect(user1)
                      .listAssert(tokenId, price, guardianAddress, startAt, endAt)

                  // Attempt to list an already listed item
                  await expect(
                      auctionHouse
                          .connect(user1)
                          .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  ).to.be.revertedWith("Item is already listed")
              })

              it("should revert when non NFT owner attempts to list", async function () {
                  await expect(
                      auctionHouse
                          .connect(user2)
                          .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  ).to.be.revertedWith("Only the owner can list")
              })

              it("should revert when price is zero", async function () {
                  await expect(
                      auctionHouse
                          .connect(user1)
                          .listAssert(tokenId, 0, guardianAddress, startAt, endAt)
                  ).to.be.revertedWith("Price must be greater than zero")
              })

              it("should revert when guardian is invalid", async function () {
                  let addressNotInGuardianList = user2.address

                  await expect(
                      auctionHouse
                          .connect(user1)
                          .listAssert(tokenId, price, addressNotInGuardianList, startAt, endAt)
                  ).to.be.revertedWith("Invalid guardian")
              })

              it("should revert when auction times are invalid", async function () {
                  await expect(
                      auctionHouse
                          .connect(user1)
                          .listAssert(tokenId, price, guardianAddress, endAt, startAt)
                  ).to.be.revertedWith("Invalid auction times")
              })
          })

          describe("cancelListing", async () => {
              beforeEach(async () => {
                  const tx = await auctionHouse
                      .connect(user1)
                      .listAssert(tokenId, price, guardianAddress, startAt, endAt)

                  tx.wait(1)
              })

              it("should cancel a listed item", async function () {
                  const tx = await auctionHouse.connect(user1).cancelListing(tokenId)
                  const receipt = await tx.wait(1)
                  expect(receipt.events[0].event).to.equal("ListingCancel")
                  expect(receipt.events[0].args.tokneId.toString()).to.equal(tokenId.toString())

                  const isListed = await auctionHouse.isListing(tokenId)
                  expect(isListed).to.be.false
              })

              it("should revert when canceling a non-listed item", async function () {
                  let nonListingTokenId = 4
                  await expect(
                      auctionHouse.connect(user1).cancelListing(nonListingTokenId)
                  ).to.be.revertedWith("Item is not listed")
              })
          })

          describe("checkUpkeep", async () => {
              beforeEach(async () => {
                  const listAssertTx = await auctionHouse
                      .connect(user1)
                      .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  await listAssertTx.wait(1)
              })

              it("should return performUpkeep = true", async function () {
                  //   console.log(Date.now())
                  //   console.log((await ethers.provider.getBlock("latest")).timestamp)
                  await ethers.provider.send("evm_increaseTime", [250])
                  await ethers.provider.send("evm_mine")
                  //   console.log((await ethers.provider.getBlock("latest")).timestamp)

                  // const performData = ethers.utils.defaultAbiCoder.encode(
                  //     ["uint256[]", "uint256[]"],
                  //     [[0], []]
                  // )
                  const listing = await auctionHouse.s_listings(0)
                  console.log(listing)

                  const { upkeepNeeded } = await auctionHouse.callStatic.checkUpkeep("0x")
                  console.log(upkeepNeeded)
                  //   const receipt = await tx.wait(1)
                  expect(upkeepNeeded).to.equal(true)
                  //   const listing = await auctionHouse.s_listings(tokenId)
                  //   expect(listing.status).to.equal(2)
                  //   expect(receipt.events[0].event).to.equal("ListingSell")
                  //   expect(receipt.events[0].args.tokenId.toString()).to.equal(tokenId.toString())
              })
          })

          describe("performUpkeep", async () => {
              beforeEach(async () => {
                  const listAssertTx = await auctionHouse
                      .connect(user1)
                      .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  await listAssertTx.wait(1)
              })

              it("should start selling", async function () {
                  await ethers.provider.send("evm_increaseTime", [250])
                  await ethers.provider.send("evm_mine")

                  const performData = ethers.utils.defaultAbiCoder.encode(
                      ["uint256[]", "uint256[]"],
                      [[0], []]
                  )

                  const tx = await auctionHouse.performUpkeep(performData)
                  const receipt = await tx.wait(1)

                  const listing = await auctionHouse.s_listings(tokenId)
                  expect(listing.status).to.equal(2)
                  expect(receipt.events[0].event).to.equal("ListingSell")
                  expect(receipt.events[0].args.tokenId.toString()).to.equal(tokenId.toString())
              })
          })

          describe("bid", async () => {
              beforeEach(async () => {
                  const listAssertTx = await auctionHouse
                      .connect(user1)
                      .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  await listAssertTx.wait(1)

                  await ethers.provider.send("evm_increaseTime", [250])
                  await ethers.provider.send("evm_mine")

                  const performData = ethers.utils.defaultAbiCoder.encode(
                      ["uint256[]", "uint256[]"],
                      [[0], []]
                  )

                  const tx = await auctionHouse.performUpkeep(performData)
                  await tx.wait(1)
              })

              it("should allow a user2 to place a bid", async function () {
                  const bidPrice = ethers.utils.parseEther("2") // 2 ETH
                  const tx = await auctionHouse.connect(user2).bid(tokenId, { value: bidPrice })
                  const receipt = await tx.wait(1)

                  const event = receipt.events[0]
                  expect(event.event).to.equal("SubmittedBid")
                  expect(event.args.buyer).to.equal(user2.address)
                  expect(event.args.tokenId.toString()).to.equal(tokenId.toString())
                  expect(event.args.bidPrice.toString()).to.equal(bidPrice.toString())

                  const listing = await auctionHouse.s_listings(tokenId)
                  expect(listing.netPrice).to.equal(bidPrice)
              })

              it("should revert when item is not selling", async function () {
                  await expect(auctionHouse.connect(user2).bid(2, { value: 1 })).to.be.revertedWith(
                      "item is not selling"
                  )
              })

              it("should revert when seller tries to bid", async function () {
                  await expect(
                      auctionHouse.connect(user1).bid(tokenId, { value: 1 })
                  ).to.be.revertedWith("seller not able bid")
              })

              it("should revert when bid price is not higher than last bid", async function () {
                  const firstBidPrice = ethers.utils.parseEther("0.2")
                  const secondBidPrice = ethers.utils.parseEther("0.1")

                  const tx = await auctionHouse
                      .connect(user2)
                      .bid(tokenId, { value: firstBidPrice })
                  await tx.wait(1)
                  await expect(
                      auctionHouse.connect(user2).bid(tokenId, { value: secondBidPrice })
                  ).to.be.revertedWith("bid price require high than last bid")
              })

              it("should revert when auction is already ended", async function () {
                  const bidPrice = ethers.utils.parseEther("2") // 2 ETH

                  await ethers.provider.send("evm_increaseTime", [3600 * 6]) // Increase time beyond the endAt time
                  await ethers.provider.send("evm_mine") // Mine a new block to apply the time change

                  await expect(
                      auctionHouse.connect(user2).bid(tokenId, { value: bidPrice })
                  ).to.be.revertedWith("auction is end")
              })
          })

          describe("withdrawProceeds", async () => {
              let bidPrice

              beforeEach(async () => {
                  // listing
                  const listAssertTx = await auctionHouse
                      .connect(user1)
                      .listAssert(tokenId, price, guardianAddress, startAt, endAt)
                  await listAssertTx.wait(1)

                  //   start Selling
                  await ethers.provider.send("evm_increaseTime", [250])
                  await ethers.provider.send("evm_mine")

                  let performData = ethers.utils.defaultAbiCoder.encode(
                      ["uint256[]", "uint256[]"],
                      [[0], []]
                  )

                  const startSellingTx = await auctionHouse.performUpkeep(performData)
                  await startSellingTx.wait(1)

                  //   bid
                  bidPrice = ethers.utils.parseEther("2") // 2 ETH
                  const bidTx = await auctionHouse.connect(user2).bid(tokenId, { value: bidPrice })
                  await bidTx.wait(1)

                  //   end Selling
                  await ethers.provider.send("evm_increaseTime", [3600 * 6]) // Increase time beyond the endAt time
                  await ethers.provider.send("evm_mine") // Mine a new block to apply the time change

                  performData = ethers.utils.defaultAbiCoder.encode(
                      ["uint256[]", "uint256[]"],
                      [[], [0]]
                  )
                  const endSellingTx = await auctionHouse.performUpkeep(performData)
                  await endSellingTx.wait(1)
              })

              it("should allow a user to withdraw their proceeds", async function () {
                  expect(await auctionHouse.s_proceeds(user1.address)).to.equal(bidPrice)

                  //   // Withdraw proceeds
                  const initialBalance = await user1.getBalance()
                  const tx = await auctionHouse.connect(user1).withdrawProceeds()
                  const receipt = await tx.wait()
                  const gasUsed = receipt.cumulativeGasUsed
                  const gasPrice = receipt.effectiveGasPrice
                  const cost = gasPrice * gasUsed

                  expect(receipt.events[0].event).to.equal("ProceedsWithdraw")
                  expect(receipt.events[0].args.user).to.equal(user1.address)
                  expect(receipt.events[0].args.proceeds.toString()).to.equal(bidPrice.toString())

                  const finalBalance = await user1.getBalance()
                  expect(finalBalance.sub(initialBalance).toString()).to.equal(
                      bidPrice.sub(cost).toString()
                  )
              })

              it("should revert when there are no proceeds to withdraw", async function () {
                  await expect(auctionHouse.connect(user2).withdrawProceeds()).to.be.revertedWith(
                      "No proceeds available"
                  )
              })
          })
      })
