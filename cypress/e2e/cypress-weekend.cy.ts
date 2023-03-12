function getRandomInt(maxNumber: number) {
  return Math.floor(Math.random() * (maxNumber + 1))
}

function visitAndConfirmCookies() {
  cy.visit("/en/airport/bcn/barcelona-el-prat-barcelona-spain/")
  cy.getByDataTest("CookiesPopup-Accept").click()
  cy.waitForNetworkIdle(5000) // I do not have huge domain knowledge about Kiwi infrastructure
}

function verifyPage() {
  cy.getByDataTest("NavBar").should("be.visible")
  cy.get("#sticky-search-form").should("be.visible")
  cy.findByRole("navigation", { name: /Breadcrumb/i }).should("be.visible")
  cy.get("h2").contains("Get to know Barcelona–El Prat (BCN)").siblings().findByAltText("Map").should("exist")
  cy.get("h2").contains("Get to know Barcelona–El Prat (BCN)").siblings().findByRole("table").should("exist")
  cy.getByDataTest("TrendingDestinations").should("be.visible")
  cy.getByDataTest("PopularFlights").should("be.visible")
  cy.getByDataTest("DestinationsMap").should("be.visible").findByAltText("Map").should("exist")
  cy.getByDataTest("Faq").should("be.visible")
  cy.getByDataTest("TopAirlines").should("be.visible")
}

function verifyBCN() {
  cy.getByDataTest("PlacePickerInput-origin").findByDataTest("PlacePickerInputPlace").contains("Barcelona BCN")
}

function verifyMainHeading() {
  cy.get("h1").should("have.text", "Barcelona–El Prat (BCN)").and("be.visible")
}

function selectPictureCard(order: number) {
  cy.getByDataTest("PictureCard")
    .eq(order)
    .findByDataTest("PictureCard-departure")
    .then((el) => {
      cy.wrap(el.text().trim()).as("origin")
      cy.wrap(el)
        .siblings()
        .first()
        .then((destinationEl) => {
          cy.wrap(destinationEl.text().trim()).as("destination")
        })
    })

  cy.getByDataTest("PictureCard")
    .eq(order)
    .find("time")
    .then((el) => {
      cy.wrap(el.text()).as("searchTime")
    })
  cy.getByDataTest("PictureCard").eq(order).focus().click({ force: true })
}

function verifyRefreshFlights() {
  cy.get<string>("@oldPseudoFlight").then((oldPseudoFlight) => {
    cy.getByDataTest("ResultCardWrapper")
      .first()
      .then((el) => {
        expect(el).not.equal(oldPseudoFlight)
      })
  })
}

function selectFlight(order: number) {
  cy.getByDataTest("ResultCardWrapper").eq(order).findByDataTest("BookingButton").click()
}

function verifySearch() {
  cy.get<string>("@origin").then((origin) => {
    cy.getByDataTest("SearchFieldItem-origin").contains(origin)
  })
  cy.get<string>("@destination").then((destination) => {
    cy.getByDataTest("SearchFieldItem-destination").contains(destination)
  })
  cy.get<string>("@searchTime").then((searchTime) => {
    cy.getByDataTest("SearchDateInput").find("[name=search-outboundDate]").should("have.have.value", searchTime)
  })
}

function addBag() {
  cy.getByDataTest("BagsPopup-cabin").find("input").should("have.value", 0)
  cy.getByDataTest("ResultCardWrapper").first().as("oldPseudoFlight")
  cy.getByDataTest("BagsPopup-cabin")
    .findByRole("button", { name: /increment/i })
    .should("be.visible")
    .click()
  cy.getByDataTest("BagsPopup-cabin").find("input").should("have.value", 1)
}

function waitVerifyPOST(alias: string, bagNumber: number) {
  cy.wait(alias)
    .its("request.body")
    .then((body) => {
      // I do not have huge domain knowlege about Kiwi infrastructure. Some Ids have different name than destination or origin (menorka/minorka).
      /* cy.get<string>("@destination").then((destination) => {
        cy.wrap(body.variables.search.itinerary.destination.ids[0]).should("include", destination.toLowerCase())
      })
      cy.get<string>("@origin").then((origin) => {
        cy.wrap(body.variables.search.itinerary.source.ids[0]).should("include", origin.toLocaleLowerCase())
      }) */
      expect(body.variables.search.passengers.adults).eq(1)
      expect(body.variables.search.passengers.adultsHandBags[0]).eq(bagNumber)
      expect(body.variables.search.passengers.children).eq(0)
    })
}

function verifyRedirectBooking() {
  cy.getByDataTest("MagicLogin-GuestTextLink").click()
  cy.url().should("include", "/en/booking?activeStep=0&backTo")
}

it("task1", () => {
  cy.step("Visit Page")
  visitAndConfirmCookies()

  cy.step("Verify all parts of page")
  verifyPage()

  cy.step("Barcelona BCN in search form")
  verifyBCN()

  cy.step("H1 headline contains text")
  verifyMainHeading()

  cy.step("Pick first card")
  selectPictureCard(0)

  cy.step("Redirect to page search/results")
  cy.url().should("include", "/en/search/results/")
  cy.waitForNetworkIdle(4000) // I do not have huge domain knowlege about Kiwi infrastructure, I need to wait so the page does not jump
  verifySearch()

  cy.step("Add backpack")
  addBag()

  cy.step("Verify new results")
  verifyRefreshFlights()

  cy.step("Click Select/Reserve")
  selectFlight(0)

  cy.step("Verify redirect to booking page")
  verifyRedirectBooking()
})

it("task2", () => {
  cy.step("Visit Page")
  visitAndConfirmCookies()

  cy.step("Verify all part of page")
  verifyPage()

  cy.step("Barcelona BCN in search form")
  verifyBCN()

  cy.step("H1 headline contains text")
  verifyMainHeading()

  cy.step("Pick random card")
  cy.intercept("POST", "https://api.skypicker.com/umbrella/v2/graphql?featureName=SearchReturnItinerariesQuery").as(
    "searchReq",
  )
  cy.getByDataTest("PictureCard")
    .its("length")
    .then((elCount) => {
      cy.wrap(getRandomInt(elCount - 1)).as("randomNumber")
    })
  cy.get<number>("@randomNumber").then((randomNumber) => {
    cy.getByDataTest("PictureCard")
      .eq(randomNumber)
      .then((el) => {
        cy.wrap(el.attr("href")).as("flightUrl")
        cy.intercept("GET", el.attr("href")).as("GETNavigateRequest")
      })
    selectPictureCard(randomNumber)
  })

  cy.step("Redirect to page search/results")
  cy.wait("@GETNavigateRequest").its("response.statusCode").should("eq", 200)
  cy.get<string>("@flightUrl").then((flightUrl) => {
    cy.url().should("include", flightUrl)
  })
  waitVerifyPOST("@searchReq", 0)
  verifySearch()
  cy.waitForNetworkIdle(4000) // I do not have huge domain knowlege about Kiwi infrastructure, I need to wait so the page does not jump

  cy.step("Add backpack")
  cy.intercept("POST", "https://api.skypicker.com/umbrella/v2/graphql?featureName=SearchReturnItinerariesQuery").as(
    "searchRefreshReq",
  )
  addBag()
  cy.getByDataTest("BagsPopup-cabin").find("input").should("have.value", 1)
  waitVerifyPOST("@searchRefreshReq", 1)

  cy.step("Verify new results")
  verifyRefreshFlights()

  cy.step("Click Select/Reserve")
  cy.getByDataTest("ResultCardWrapper")
    .its("length")
    .then((elCount) => {
      selectFlight(getRandomInt(elCount - 1))
    })

  cy.step("Verify redirect to booking page")
  verifyRedirectBooking()
})
