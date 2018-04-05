// This is a manifest file that'll be compiled into application.js, which will include all the files
// listed below.
//
// Any JavaScript/Coffee file within this directory, lib/assets/javascripts, or any plugin's
// vendor/assets/javascripts directory can be referenced here using a relative path.
//
// It's not advisable to add code directly here, but if you do, it'll appear at the bottom of the
// compiled file. JavaScript code in this file should be added after the last require_* statement.
//
// Read Sprockets README (https://github.com/rails/sprockets#sprockets-directives) for details
// about supported directives.
//
//= require jquery3
//= require jquery_ujs
//= require jquery-ui
//= require components
//= require turbolinks
//= require popper
//= require bootstrap.min
// require chartjs/Chart.min.js
//= require pace.min
//= require_tree .

function progressBar() {
  $("#progressbar").progressbar({
    value: false
  });

  var progressbar = $("#progressbar")
  var progressbarValue = progressbar.find( ".ui-progressbar-value" )
  progressbar.progressbar( "option", "value", false )
  progressbarValue.css({"background": "#00bfff"})
  $("#progressbar").show()
  $("#progressbar").focus()
}

function initiateFundNewAccount() {
  $("#progressbar").hide()

  $("#secret-seed").prop("disabled", false)
  $("#target-account").prop("disabled", false)
  $("#amount-to-send").prop("disabled", false)
  $("#asset-type").prop("disabled", false)
  $("input[name=memotype]").removeAttr("disabled")
  $("input[name=fund-new]").removeAttr("disabled")
  $("#memo").prop("disabled", false)
  $("#send_money").show()
  $("#cancel-btn").show()

  $("#layout-alert").show()
  $("#layout-alert").html("Target account is not active Yet. Select Fund New Account option to activate it by sending 1 XLM.")
  $("#layout-alert").focus()
}

function hideFormControls() {
    $("#secret-seed").prop("disabled", true)
    $("#target-account").prop("disabled", true)
    $("#amount-to-send").prop("disabled", true)
    $("#asset-type").prop("disabled", true)
    $("input[name=memotype]").attr("disabled", "disabled")
    $("input[name=fund-new]").attr("disabled", "disabled")
    $("#memo").prop("disabled", true)
    $("#send_money").hide()
    $("#cancel-btn").hide()
}

function amountNotWithinLimit(amount) {
  balance = $("#available-balance").text().split(" ")[0]

  if (parseFloat(amount) < parseFloat(balance)) {
    return false
  } else {
    return true
  }
}

function checkMemoSize(memo, memo_type) {
  var set_memo = "Memo"
  var memo_data = []

  try {
    if (memo_type == 'id') {
      set_memo = StellarSdk.Memo.id(memo)
    } else if (memo_type == 'hash') {
      set_memo = StellarSdk.Memo.hash(memo)
    } else if (memo_type == 'return') {
      set_memo = StellarSdk.Memo.return(memo)
    } else {
      set_memo = StellarSdk.Memo.text(memo)
    }
    memo_data = [false, set_memo]
  } catch(error) {
    console.log(error)
    memo_data = [true, error.message]
  }
  return memo_data
}

function processTransfer(fund_account) {
  try {
    // var server = new StellarSdk.Server('https://horizon-testnet.stellar.org')
    var server = new StellarSdk.Server('https://horizon.stellar.org')
    StellarSdk.Network.usePublicNetwork()
    // StellarSdk.Network.useTestNetwork()

    var sourceSecretKey = document.getElementById('secret-seed').value.replace(/\s/g,'')
    var receiverPublicKey = document.getElementById('target-account').value.replace(/\s/g,'')
    var amount = document.getElementById('amount-to-send').value.replace(/\s/g,'')

    var memo_type = $("input[name=memotype]:checked").val()
    var memo_input = document.getElementById('memo').value
    var memo_data = checkMemoSize(memo_input, memo_type)
    var memo = memo_data[1]
    var memo_size_exceeds_limit = memo_data[0]

    var asset_tag = document.getElementById('asset-type')
    var asset = asset_tag.options[asset_tag.selectedIndex].text

    if (asset == "Lumens") {
      asset = StellarSdk.Asset.native()
    } else {
      var asset_arr = asset.split(',')

      var asset_code = asset_arr[0].replace(/\s/g,'')

      var asset_issuer = asset_arr[1].replace(/\s/g,'')

      asset = new StellarSdk.Asset(asset_code, asset_issuer)
    }

    if (sourceSecretKey.length == 0 || receiverPublicKey.length == 0 || amount.length == 0) {
      $("#layout-alert").show()
      $("#layout-alert").html("Please Enter All Details.")
      return

    } else if (amountNotWithinLimit(amount)) {
      $("#layout-alert").show()
      $("#layout-alert").html("Amount you entered exceeds your balance.")
      return
    } else if (memo_size_exceeds_limit) {
      $("#layout-alert").show()
      $("#layout-alert").html("Memo Error: " + memo)
      return
    } else {
      $("#layout-alert").hide()
      hideFormControls()
      progressbar()
      if (fund_account) {
        fundNewAccount(server, sourceSecretKey, receiverPublicKey, amount, memo_type, memo, asset)
      } else {
        sendMoney(server, sourceSecretKey, receiverPublicKey, amount, memo_type, memo, asset)
      }
    }
  } catch(error) {
    console.log(error.message)
    document.location.href = '/failed?error_description=Wrong Input. Please enter Correct Target Account Address, Correct Private Key and other details. Error Message: ' + error.message
  }
}

function sendMoney(server, sourceSecretKey, receiverPublicKey, amount, memo_type, memo, asset) {

    // Derive Keypair object and public key (that starts with a G) from the secret
    var sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey)

    var sourcePublicKey = sourceKeypair.publicKey()

    server.loadAccount(sourcePublicKey)
     .then(function(account) {
       var transaction = new StellarSdk.TransactionBuilder(account)
         // Add a payment operation to the transaction
         .addOperation(StellarSdk.Operation.payment({
           destination: receiverPublicKey,
           // The term native asset refers to lumens
           // asset: StellarSdk.Asset.native(),
           asset: asset,
           // Lumens are divisible to seven digits past the decimal.
           // They are represented in JS Stellar SDK in string format
           amount: amount
         }))
         .addMemo(memo)
         .build()

       // Sign this transaction with the secret key
       transaction.sign(sourceKeypair)

       server.submitTransaction(transaction)
         .then(function(transactionResult) {
           // console.log(JSON.stringify(transactionResult, null, 2))
           // console.log('\nSuccess! View the transaction at: ')
           // console.log(transactionResult._links.transaction.href)
           var message = 'Amount ' + amount + ' ' + asset.code + ' transferred to ' + receiverPublicKey + ' successfully.'
           document.location.href = '/success?transaction_url=' + transactionResult._links.transaction.href + '&message=' + message
           $.ajax({
             url: "/get_balances"
           }) 
         })
         .catch(function(err) {
           console.log('An error has occured:')
           console.log(err)

           var result_code = err.data.extras.result_codes.operations[0]

           if (result_code == 'op_no_destination') {
             initiateFundNewAccount()
           } else if (result_code == 'op_underfunded') {
             var message = "You do not have enough balance."
             document.location.href = '/failed?error_description=' + message
           } else if (result_code == 'op_no_trust') {
             var message = "The target address " + receiverPublicKey + " do not trust asset " + asset.code + "."
             document.location.href = '/failed?error_description=' + message
           } else {
             document.location.href = '/failed?error_description=' + "Unkown Error. Please Check Network Connection."
           }
         }) // submit transaction end
     })
     .catch(function(e) {
       console.log(e.message.detail)
       console.error(e)
       if (e.message.detail == undefined) {
         document.location.href = '/failed?error_description=' + e
       } else {
         document.location.href = '/failed?error_description=' + e.message.detail
       }
     }) // load account end
} // send money function end

// ***
// fund new account block start
function submitTransaction(server, transaction, receiverPublicKey, amount) {    
  server.submitTransaction(transaction)
    .then(function(transactionResult) {
      // console.log(JSON.stringify(transactionResult, null, 2))
      // console.log('\nSuccess! View the transaction at: ')
      //console.log(transactionResult._links.transaction.href)
      document.location.href = '/success?transaction_url=' + transactionResult._links.transaction.href + '&message=New Account with adderess </br>' + receiverPublicKey + ', Funded with amount ' + amount + ' and Activated.'
      $.ajax({
        url: "/get_balances"
      }) 
    })
    .catch(function(err) {
      console.log('An error has occured:')
      console.log(err)
      document.location.href = '/failed?error_description=' + err.message
    })
} // submitTransaction end
  
function buildTransaction(sourceSecretKey, sourcePublicKey, sequence, receiverPublicKey, amount, memo) {
  var account = new StellarSdk.Account(sourcePublicKey, sequence)

  var transaction = new StellarSdk.TransactionBuilder(account)
    .addOperation(StellarSdk.Operation.createAccount({
      destination: receiverPublicKey,
      startingBalance: amount
    }))
    .addMemo(memo)
    .build()

  transaction.sign(StellarSdk.Keypair.fromSecret(sourceSecretKey))
  return transaction
} // buildTransaction end

function alreadyFunded(server, receiverPublicKey) {
  var status_code = 200
  server.accounts()
    .accountId(receiverPublicKey)
    .call()
    .then(function(accountResult) {
    }).catch(function (err) {
      status_code = err["message"]["status"]
    })

  if (parseInt(status_code) == 404) {
    return false
  } else {
    return true
  }
} // alreadyFunded end

function fundNewAccount(server, sourceSecretKey, receiverPublicKey, amount, memo_type, memo, asset) {
    var sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecretKey)
    var sourcePublicKey = sourceKeypair.publicKey()

    if (alreadyFunded(server, receiverPublicKey)) {
      var message = "Account is Already Active. Account Address: " + receiverPublicKey
      document.location.href = '/failed?error_description=' + message
      return
    } else {
      server.accounts()
        .accountId(sourcePublicKey)
        .call()
        .then(function(accountResult) {
          var transaction = buildTransaction(sourceSecretKey, sourcePublicKey, accountResult.sequence, receiverPublicKey, amount, memo)
          submitTransaction(server, transaction, receiverPublicKey, amount)
        })
        .catch(function (err) {
          console.log(err)
          document.location.href = '/failed?error_description=' + err.message.detail
        })
    }
} // fund new account block end

// Trust Assets
function createTrustTransaction(limit, account, asset) {
  if (limit.length > 0) {
    return new StellarSdk.TransactionBuilder(account)
    .addOperation(StellarSdk.Operation.changeTrust({
      asset: asset,
      limit: limit
    })).build()
  } else {
    return new StellarSdk.TransactionBuilder(account)
    .addOperation(StellarSdk.Operation.changeTrust({
      asset: asset
    })).build()
  }
}

function trustAssets(assetCode, assetIssuer, limit, sourcePublicKey, sourceSecretKey){
  try {
    var server = new StellarSdk.Server('https://horizon.stellar.org')
    var asset = new StellarSdk.Asset(assetCode, assetIssuer)
    var sourceKeyPair = StellarSdk.Keypair.fromSecret(sourceSecretKey)
    // var sourceKeypair = StellarSdk.Keypair.fromPublicKey(sourcePublicKey)

    StellarSdk.Network.usePublicNetwork()
    server.loadAccount(sourcePublicKey)
    .then(function(account){
      var transaction = createTrustTransaction(limit, account, asset)
      transaction.sign(sourceKeyPair)
      server.submitTransaction(transaction)
        .then(function(result){
          console.log(result)
          var link = result['_links']['transaction']['href']
          document.location.href = '/success?transaction_url=' + link + '&message=Asset ' + assetCode + ' trusted successfully.'
          $.ajax({
            url: "/get_balances"
          })
        })
        .catch(function(err) {
          console.log("ERROR!" + err)
          if (err.data.extras.result_codes.operations[0] == "op_low_reserve") {
            document.location.href = '/failed?error_description=Low Base Reserve. Visit https://www.stellar.org/developers/guides/concepts/fees.html for more details.'
          } else {
            document.location.href = '/failed?error_description=' + err
          }
        })
    })
    .catch(function(error){
      console.log('ERROR!', error)
      document.location.href = '/failed?error_description=' + error
    })
  } catch(error) {
      console.log('ERROR!', error)
      document.location.href = '/failed?error_description=' + error.message
  }
}
// end trust asset
// 
// remove url param
function removeURLParam(url, param) {
  var urlparts = url.split('?')

  if (urlparts.length >= 2) {
   var prefix = encodeURIComponent(param) + '='
   var pars = urlparts[1].split(/[&;]/g)

   for (let i=pars.length; i-- > 0;)
     if (pars[i].indexOf(prefix, 0) == 0)
       pars.splice(i, 1)

     if (pars.length > 0)
       return urlparts[0] + '?' + pars.join('&')
     else
       return urlparts[0]
  } else {
    return url
  }
}