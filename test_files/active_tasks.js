// Set Session stuff
var pre = 'active_tasks_';
let get = function (n) { return Session.get(pre + n) };
let set = function (n, v) { Session.set(pre + n, v); };

// Takes in any SQL query 'queryString' and returns the results to the caller
function SQLquery(queryString, callback) {
  let data = [];
  data.push({qName: 'queryResults', Query: queryString } );
  Meteor.call('fetchFromAPI', 'multi', data, Session.get('vKey'), function (err, results) {
     if ( err ) {
         // report error
         console.log('Error: active_tasks.js line 13 %s',err);
     }
     else {
       let recs = results.queryResults;
       if ( Array.isArray(recs) ) {
         // recs has an array of the rows returned
         callback( recs );
       }
       else {
         console.log('Error'); console.log(results);
       }
     }
  });
}


Template.active_tasks.created = function (){
  let queryResults = [];
  let containerSize = ""; // Set to an empty string, not 0
  let currentIndex = 0;
  /* set('queryResults', queryResults);
  set('containerSize', containerSize); */
  set('currentIndex', currentIndex);

  // Get today's date, in the format that matches dates in the database: '2018-04-02T19:17:50.198Z'
  todaysDate = new Date().toISOString();
  let thisPrintShopID = ody.get_printshop_id();

  /*Use this data for testing, since the database doesn't yet have due dates scheduled for today
  let todaysDate = "2017-04-19T05:00:00.000Z";
  let thisPrintShopID = '8666';

  Query used: ---------------------------------------
  select
    odyssey_js.Printshop_ID as jd_printshopID,
    ws4p.Printshop_ID as ws4p_printshopID,
    odyssey_jd.Description as taskName,
    odyssey_jd.Completed as comp,
    odyssey_js.Scheduled_End as dueDate,
    odyssey_jd.Job_ID as jobID,
    odyssey_jd.Dept_ID as deptID,
    ws4p.Department as deptName,
    odyssey_js.Assigned_To as assignedTo,
    address.Contact_ID as contactId,
    address.First_Name as firstName,
    address.Last_Name as lastName,
    contacts.Photo as photo
  from
    odyssey.ody_job_details odyssey_jd,
    odyssey.ody_job_schedule odyssey_js,
    ws4p.customer_service_department ws4p,
    websitesforprinters.address address,
    websitesforprinters. contacts contacts
  where
    odyssey_jd.Job_ID = odyssey_js.Job_ID and
    odyssey_js.Scheduled_End <= '2017-04-18T05:00:00.000Z' and
    odyssey_jd.Completed = 0 and
    odyssey_jd.Dept_ID = ws4p.ID and
    odyssey_js.Printshop_ID = '8666' and
    odyssey_js.Printshop_ID =  ws4p.Printshop_ID and
    odyssey_js.Printshop_ID =  address.Printshop_ID and
    odyssey_js.Assigned_To != 0 and
    odyssey_js.Assigned_To = address.Contact_ID and
    address.Contact_ID = contacts.Contact_ID;
  --------------------------------------------------*/

  /* let queryString = "select odyssey_js.Printshop_ID as jd_printshopID, odyssey_jd.Description as taskName, odyssey_js.Scheduled_End as dueDate, odyssey_jd.Job_ID as jobID, odyssey_jd.Dept_ID as deptID, ws4p.Department as deptName, address.First_Name as firstName, address.Last_Name as lastName, contacts.Photo as photo from odyssey.ody_job_details odyssey_jd, odyssey.ody_job_schedule odyssey_js, ws4p.customer_service_department ws4p,  websitesforprinters.address address, websitesforprinters.contacts contacts where odyssey_jd.Job_ID = odyssey_js.Job_ID and odyssey_js.Scheduled_End <= '" + todaysDate + "' and odyssey_jd.Completed = 0 and odyssey_jd.Dept_ID = ws4p.ID and odyssey_js.Printshop_ID = '" + thisPrintShopID + "' and odyssey_js.Printshop_ID = ws4p.Printshop_ID and odyssey_js.Printshop_ID = address.Printshop_ID and odyssey_js.Assigned_To != 0 and odyssey_js.Assigned_To = address.Contact_ID and address.Contact_ID = contacts.Contact_ID;"

  SQLquery(queryString, function(queryResults) {
      // console.log(queryString);
      // console.log("queryResults:", queryResults);
      set('queryResults', queryResults);
      set('containerSize', queryResults.length);
      // set('containerSize', 0); // Test the empty container
  }); */
  // Initialize Session variables
  set('inCycle', false);
  set('wait', false);

};


const formatDateTime = function (isoDate){
  // Format date and time for the Active Task widget view
    datetime = moment(isoDate, 'YYYY-MM-DD HH:mm').toDate();
  //datetime = new Date(isoDate);
  day = datetime.getDate();
  month = datetime.getMonth() + 1; //month: 0-11
  year = datetime.getFullYear();
  year = year.toString().slice(-2); // 2 digit year
  dateString = month + "/" + day + "/" + year;
  let options = {
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  };
  let timeString = datetime.toLocaleString('en-US', options);
  let formattedDateTime = dateString + ' ' + timeString;
  return formattedDateTime;
}


const cycle = function() {
  let currentIndex = get('currentIndex')
  let containerSize = get('containerSize');
  let wait = get('wait');
  if(!wait) {
    currentIndex++
    // Cycle back to the beginning of the array
    if (currentIndex === containerSize) {
      currentIndex = 0;
    }
    set('currentIndex', currentIndex);
  } else {
    // console.log("Waiting..")
    set('wait', false);
  }
  startCycle = Meteor.setTimeout(function(){cycle();}, 5000)
};

// Function to stop the timer
const stopCycle = function () {
    Meteor.clearTimeout(startCycle);
}

Template.active_tasks.events({
  // set a session variable to store the value (Dept_ID) from the select menu
  'click .nav-left': function(e){
    let $this = $( e.currentTarget );
    let listTraverse = -1;
    let currentIndex = get('currentIndex');
    let containerSize = get('containerSize');
    currentIndex = currentIndex + listTraverse
    if(currentIndex === containerSize){
      currentIndex = 0; // loop from end of array, back to beginning
    } else if (currentIndex === -1) {
      currentIndex = containerSize-1; // loop from beginning of array to the end
    }
    set('currentIndex', currentIndex);
    set('wait', true);
  },
  'click .nav-right': function(e){
    let $this = $( e.currentTarget );
    let listTraverse = 1;
    let currentIndex = get('currentIndex');
    let containerSize = get('containerSize');
    currentIndex = currentIndex + listTraverse
    if(currentIndex === containerSize){
      currentIndex = 0; // loop from end of array, back to beginning
    } else if (currentIndex === -1) {
      currentIndex = containerSize-1;
    }
    set('currentIndex', currentIndex);
    set('wait', true);
  }

});

Template.active_tasks.helpers({

  getTaskDetails: function () {
    let inCycle = get('inCycle');
    if (!inCycle) {
      set('inCycle', true);
      cycle();
    }
    let tasks = get('queryResults');
    let currentIndex = get('currentIndex');
    l = tasks[currentIndex];
    if ( ! l ) l = {};

    // Get shopURL to build employee photo URL
    // http://odyssey.websitesforprinters.com/
    let shopURL = ody.get_shop_url();
    let photoName = l.photo;
    // let photoName = '../1001/009_MarketingArticle.jpg' // use for testing
    if(photoName) {
      // get rid of the ../ at the beginning of photo names found in the db
      let firstThreeChars = photoName.substring(0,3);
      if (firstThreeChars === '../' ) {
        photoName = photoName.substr(3);
      }
      let employeePhoto = shopURL + photoName;
      // console.log("employeePhoto", employeePhoto)
      l.employeePhoto = employeePhoto;
    } else {
      if ( l.firstName ) {
        l.initials = l.firstName.charAt(0) + l.lastName.charAt(0);
      }
    }

    let tn = l['taskName'];
    if( l.taskName && l.taskName.length > 12){
      l.shortenedTaskName = l.taskName.substring(0, 12) + '...';
    } else {
      l.shortenedTaskName = tn;
    }
    l.formattedDateTime = formatDateTime(l.dueDate)
    return [tasks[currentIndex]]; // return an array of length 1
  },

  // Handle the case of the empty container
  emptyContainer: function () {
    let containerSize = get('containerSize');
    return containerSize === 0;
  }

});
