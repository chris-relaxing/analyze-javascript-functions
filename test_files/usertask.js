 let pre = "usertask_";
let get = function (n) {
  return Session.get(pre+n)
};
let set = function (n, v) {
  Session.set(pre+n, v);
};

Template.usertask.created = function () {
  set('loaded', false );

  // Assigned Tasks Completed prog bar starts off with width of 0 (assCompPerc)
  let assignedCompPerc = 0;
  set('assCompPerc', assignedCompPerc);

  let curJob = "No Jobs";
  let curTask = "No Tasks";
  set('currentJob', curTask);
  set('currentTask', curJob);
  let completedEarly = 0;
  set('completedErly', completedEarly);
  let usersTasks = [];
  set('usrsTsks', usersTasks);
  set('myTasks', usersTasks );

  loadResources(function(){
    // console.log('loadResources complete');
  });

  loadUserTaskData( "all", function() {
    set( 'loaded', true );
    let myTasks = get('myTasks');
    set( 'usrsTsks', myTasks );
  });
}

const getTaskColors = function() {
  let colors =  [{
      primaryColor: 'rgba(88,163,200,0.40)',
      secondaryColor: '#58A3C8',
      detailColor: 'rgba(88,163,200,0.20)'
  }, {
      primaryColor: 'rgba(120,205,210,0.40)',
      secondaryColor: '#78CDD2',
      detailColor: 'rgba(120,205,210,0.20)'
  }, {
      primaryColor: 'rgba(116,174,178,0.40)',
      secondaryColor: '#74AEB2',
      detailColor: 'rgba(116,174,178,0.20)'
  }, {
      primaryColor: 'rgba(179,212,80,0.40)',
      secondaryColor: '#B3D450',
      detailColor: 'rgba(179,212,80,0.20)'
  }, {
      primaryColor: 'rgba(225,204,38,0.40)',
      secondaryColor: '#E1CC26',
      detailColor: 'rgba(225,204,38,0.20)'
  }];
  return colors;
};

const loadUserTaskData = function( type, callback ) {
  let data = [{ qName: 'manualTasks', Type: type }, { qName: 'userTaskData' },];
  let colors = getTaskColors();
  if( type ) data.Type = type;
  ody.api_call( 'multi', data, function( results ) {
    if( results ) {

      // sort and add colors to the unassigned tasks
      // -----------------------------------------------------------------------
      if( results.userTaskData.unassigned && results.userTaskData.unassigned.length ) {
        let colorIndex = 0;
        let unassignedResults = [];
        for (let i = 0; i < results.userTaskData.unassigned.length; i++) {
          unassignedResults[i] = results.userTaskData.unassigned[i];
          unassignedResults[i].primaryColor = colors[colorIndex].primaryColor;
          unassignedResults[i].secondaryColor = colors[colorIndex].secondaryColor;
          unassignedResults[i].iconImage = '/img/rocket_white.svg';
          unassignedResults[i].Index = i;
          unassignedResults[i].marketingTask = false;

          // If colorIndex gets to 4, reset it to zero. Otherwise increment.
          colorIndex = (colorIndex === 4) ? 0 : colorIndex+=1;
        }
        unassignedResults.sort(function (a, b) {
          return new Date(a.Scheduled_Start) - new Date(b.Scheduled_Start);
        });
        set('unassignedTasks', unassignedResults);
      }

      // sort and add colors to the assigned tasks
      // -----------------------------------------------------------------------
      let finalJobResults = [];
      if( results.userTaskData.assigned && results.userTaskData.assigned.length ) {
        let date = new Date();
        let completedEarly = 0;
        set('completedErly', completedEarly);
        date = date.getUTCFullYear() + '-' +
            ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
            ('00' + date.getUTCDate()).slice(-2) + ' ' +
            ('00' + date.getUTCHours()).slice(-2) + ':' +
            ('00' + date.getUTCMinutes()).slice(-2) + ':' +
            ('00' + date.getUTCSeconds()).slice(-2);
        let inProgTaskTotal = 0;
        let taskPercTotal = 0;
        let taskCompletedThisWeek = 0;
        let totalNumTasks = 0;
        let jobResults = results.userTaskData.assigned;
        // console.log('Results', results);
        // console.log('jobResults', jobResults, jobResults.length);
        for (let i = 0; i < jobResults.length; i++) {
          if (jobResults[i].Percent_Complete != 100) {
            finalJobResults[totalNumTasks] = jobResults[i];
            finalJobResults[totalNumTasks].iconImage = '/img/rocket_white.svg';
            finalJobResults[totalNumTasks].marketingTask = false;

            // If there is a Percent_Complete that is not zero, add to taskPercTotal
            if (jobResults[i].Percent_Complete) {
                taskPercTotal += parseInt(jobResults[i].Percent_Complete);
            }
            // inProgTaskTotal is the number of tasks that have a Percent_Complete > 0
            if (parseInt(jobResults[i].Percent_Complete) > 0) {
                inProgTaskTotal++;
            }
            // totalNumTasks is a count of the number of Assigned tasks
            totalNumTasks++;
          } else if (jobResults[i].Percent_Complete === 100 && (Date.parse(date) - Date.parse(jobResults[i].Date_Created)) < 7) {
            taskCompletedThisWeek++;
          } else {
            let alreadyCompletedEarly = get( 'completedErly' );
            if( jobResults[i].Scheduled_End && parseInt( jobResults[i].Date_Created ) < parseInt( jobResults[i].Scheduled_End ) ) {
              // Fix if statement logic
              alreadyCompletedEarly++;
              set('completedErly', alreadyCompletedEarly);
            }
            let oneDay = 1000 * 60 * 60 * 24;
            let oneWeek = oneDay * 7;
            let myDate = Date.parse(date);
            let myTaskDate = Date.parse(jobResults[i].Date_Created);
            if ((myDate - myTaskDate) < oneWeek) {
                taskCompletedThisWeek++;
            }
          }
        }

        // Let's not forget about the Assigned Tasks that have already been completed this week!
        // console.log('Total number of assigned tasks:', totalNumTasks);
        // Add the taskCompletedThisWeek to the totalNumTasks
        totalNumTasks = totalNumTasks + taskCompletedThisWeek;
        // console.log('Real total number of assigned tasks this week:', totalNumTasks);
        // Add the taskCompletedThisWeek * 100 to taskPercTotal
        taskPercTotal = taskPercTotal + (taskCompletedThisWeek * 100);

        // Check for completed manual marketing tasks (ODY-978)
        ody.api_call( 'manualTasksCompleted', {}, function( result ) {
          if( result && result[ ody.get_userid()] ) {
            let completedManualMarketingTasks = parseInt( result[ody.get_userid()] );
            // console.log("Completed manual marketing tasks:", completedManualMarketingTasks);
            totalNumTasks = totalNumTasks + completedManualMarketingTasks;
            taskPercTotal = taskPercTotal + (completedManualMarketingTasks * 100);
            taskCompletedThisWeek = taskCompletedThisWeek + completedManualMarketingTasks;

            set('totalNumTasks', totalNumTasks);
            set('taskPercTotal', taskPercTotal);
            set('taskCompletedThisWeek', taskCompletedThisWeek);
            updateAssignedTasksCompleted();
          }
        });

        set('inProgTaskTotal', inProgTaskTotal);
        set('totalNumTasks', totalNumTasks);
        set('taskPercTotal', taskPercTotal);
        set('taskCompletedThisWeek', taskCompletedThisWeek);

      }

      // sort and add colors to the manual Marketing tasks
      // -----------------------------------------------------------------------
      if(results.manualTasks){
        let myTasks = get('myTasks');
        totalNumTasks = get('totalNumTasks');
        // Gather manual Marketing Tasks for the user task list (ODY-697)
        let myMarketingTasks = [];
        let marketingTasks = results.manualTasks; // from api
        let currentUserID = ody.get_userid();
        // console.log("marketingTasks", marketingTasks);
        for(i = 0; i < marketingTasks.length; i++){
          row = marketingTasks[i];
          contactID = row.Contact_ID;
          // console.log("contactID", contactID);
          if(parseInt(contactID) === currentUserID){
            // The task list needs a Detail_ID, so use the campaign Action_ID
            row['Detail_ID'] = row.Action_ID;
            row['iconImage'] = '/img/rocket_white.svg';
            row['Description'] = 'Marketing Campaign';
            row['Scheduled_End'] = row.Date;
            row['Scheduled_Start'] = row.Date;
            row['marketingTaskDescription'] = row.Task;
            row['marketingTask'] = true;
            myMarketingTasks.push(row);
            totalNumTasks++;
          }
        }
        // console.log("These are my regular tasks:", myTasks);
        // console.log("These are my Marketing tasks:", myMarketingTasks);
        set('myMarketingTasks', myMarketingTasks);

        for(i = 0; i < myMarketingTasks.length; i++){
          finalJobResults.push(myMarketingTasks[i]);
        }

        // sort finalJobResults, which now also includes manual Marketing tasks
        finalJobResults.sort(function (a, b) {
          return new Date(a.Scheduled_Start) - new Date(b.Scheduled_Start);
        });

        // apply colors to finalJobResults
        let jobColorIndex = 0;
        for (let i = 0; i < finalJobResults.length; i++) {
          finalJobResults[i].primaryColor = colors[jobColorIndex].primaryColor;
          finalJobResults[i].secondaryColor = colors[jobColorIndex].secondaryColor;
          finalJobResults[i].Index = i;
          // If jobColorIndex gets to 4, reset it to zero. Otherwise increment.
          jobColorIndex = (jobColorIndex === 4) ? 0 : jobColorIndex+=1;
        }

        // Add manual marketing tasks to the total number of tasks for
        // the "Assigned Tasks Completed" progress bar:
        set('totalNumTasks', totalNumTasks);

        // console.log('finalJobResults', finalJobResults);
        set('myTasks', finalJobResults);
        // console.log('myTasks merged:', finalJobResults);

      }
      initializeAssignedTasksCompleted();

    }
    if( callback && typeof callback === "function" ) callback();
  });
};

const updateAssignedTasksCompleted = function() {
  // Update the Assigned Tasks Completed bar
  let taskPercTotal = get('taskPercTotal');
  let totalNumTasks = get('totalNumTasks');
  let finalAssignedPerc = taskPercTotal / totalNumTasks;
  // console.log('finalAssignedPerc, taskPercTotal, totalNumTasks', finalAssignedPerc, taskPercTotal, totalNumTasks );
  if (finalAssignedPerc === NaN) {
      finalAssignedPerc = 0;
  }
  finalAssignedPerc = Math.round(finalAssignedPerc);
  let strAssignPerc = finalAssignedPerc.toString();
  strAssignPerc += "%";
  set('assCompPerc', strAssignPerc);

};

const initializeAssignedTasksCompleted = function() {
    // This block supports the "Assigned Tasks Completed" progress bar
    // at the top of the /usertask page

    // Get data needed for percentages for all 'regular' tasks
    // -----------------------------------------------------------------------
      totalNumTasks = get('totalNumTasks');
      taskPercTotal = get('taskPercTotal');

      // console.log('totalNumTasks is:', totalNumTasks);
      // console.log('taskPercTotal is:', taskPercTotal);

    // Add percentages for all 'manual marketing' tasks
    // -----------------------------------------------------------------------
    // totalNumTasks is already correct.
    // Need to add the manual task completion percentages to taskPercTotal, then recalculate and reset values
      let myMarketingTasks = get('myMarketingTasks');
      if(myMarketingTasks.length > 0){
        for(i = 0; i < myMarketingTasks.length; i++){
          let List = myMarketingTasks[i].List;
          let numOfContacts = List.length;
          let Running_ID = myMarketingTasks[i].Running_ID;
          let Action_ID = myMarketingTasks[i].Action_ID;

          let queryString = "SELECT * from mc_running WHERE Running_ID = " + Running_ID + ";";
          getManualMarketingTaskHistory(queryString, function(taskHistory) {
            processedList = taskHistory[Action_ID]['processed'];

            let numProcessed = 0;
            if(processedList){ numProcessed = processedList.length; }
            let percComp = (numProcessed / numOfContacts) * 100;
            // console.log('percComp is:', percComp);
            taskPercTotal = taskPercTotal + percComp;
            // console.log('At loading, taskPercTotal is:', taskPercTotal);

            // Make this calculation wait for the results of the taskHistory query
            set('taskPercTotal', taskPercTotal);
            set('totalNumTasks', totalNumTasks);
            // console.log('taskPercTotal', taskPercTotal );
            // console.log('totalNumTasks', totalNumTasks );

            updateAssignedTasksCompleted();

          });
        }
      } else {  // Case of no marketing tasks
        updateAssignedTasksCompleted();
      }

};

const loadResources = function(callback) {
  // when showing task detail, ody.est_component_info() expects certain values to be stored in session.
  // this function sets them up.

  // Set them as blank to start
  Session.set('estimate_cp_resource_list',[]);
  Session.set('estimate_cp_departments',[]);

  let data = [];
  let where = "Code NOT LIKE 'paper_%' AND Code NOT LIKE 'press_%' AND Code != 'ink' AND Code != 'envelopes'";
  data.push({ qName: 'queryResults', Query: sprintf('SELECT Code,Type_ID from resource_types WHERE %s', where) });
  let depts = ody.collections.departments.find().fetch();
  if( depts && depts.length ) Session.set( 'estimate_cp_departments', depts );
  else data.push({ qName: 'departments'});
  Meteor.call('fetchFromAPI', 'multi', data, Session.get('vKey'), function (err, results) {
    if ( err ) {
      console.log('Error usertask.js loadResources()',err,data);
    } else {
      let recs = results.queryResults;
      if ( ! Array.isArray(recs)) recs = [];
      let codes = [];
      let ids = [];
      for ( let i=0; i < recs.length; i++ ) {
        codes.push( recs[i].Code );
        ids.push( parseInt(recs[i].Type_ID));
      }
      if ( ids.length === 0 ) ids.push(0);
      Session.set('estimate_cp_resource_list',codes);
      if( results.departments ) {
        Session.set('estimate_cp_departments',results.departments);
        ody.populate_collection( 'departments', results.departments );
      }
      let data = [];
      data.push({ qName: 'queryResults', Query: sprintf('SELECT * from resources WHERE Type_ID IN (%s)', ids.join(',')) });
      Meteor.call('fetchFromAPI', 'multi', data, Session.get('vKey'), function (err, results) {
        if ( err ) {
          console.log('Error usertask.js line 251',err,data);
        } else {
          let resources = results.queryResults;
          if ( ! Array.isArray(resources)) resources = [];
          for ( let i=0; i < ids.length; i++ ) {
            let op = [];
            for ( let i2=0; i2 < resources.length; i2++ ) {
              let resource = resources[i2];
              if ( parseInt(resource.Type_ID) === ids[i]) {
                op.push(resource);
              }
            }
            let code = codes[i];
            Session.set(sprintf('estimate_cp_resource_%s',code),op);
          }
        }
        callback();
      });
    }
  });
};

Template.usertask.events({
    // Clicked a task to see more details
    'click .userTask, .rocketIcon, .taskJobDetails, .taskId, .taskJobId': function (e) {
        e.preventDefault();
        let taskSelected = e.target.id;
        // console.log("Current Detail_ID: ", taskSelected);
        set('currentTask', taskSelected);

        let clickedBtn = document.getElementById(e.target.id);
        let currentIndex = clickedBtn.getAttribute('data-index-number');
        set('currentIndex', currentIndex);
        // console.log("Current Index ", currentIndex);
        let myJobId = clickedBtn.getAttribute('name');
        set('currentJob', myJobId);
        // console.log("Current Job Selected: ", myJobId);

        let myColor = clickedBtn.getAttribute('data-id');
        set('curTaskColor', myColor);
        let myPrimColor = clickedBtn.getAttribute('primary-color');
        let mySecondaryColor = clickedBtn.getAttribute('secondary-color');
        set('selectedPrimaryColor', myPrimColor);
        let myDescription = clickedBtn.getAttribute('data-cmd');
        let marketingTask = clickedBtn.getAttribute('marketingTask');
        // console.log("marketingTask", marketingTask, clickedBtn);
        let myNote = clickedBtn.getAttribute('data-type');
        if (myNote === null) {
          // console.log("No Note For this task");
        }

        document.getElementById("taskRocket").style.display = "inline-block";
        document.getElementById("taskProgBar").style.display = "block";
        document.getElementById('taskDetailsStart').style.display = "none";
        document.getElementById('taskContent').style.display = "block";

        // If there is no "Finish" button, it means this task has already been completed.
        // Therefore, use a rocket icon in the task details
        if (document.getElementById("taskFinishBtn")) {
          $("#taskRocket .rocIcon").attr("src","/img/rocket_white.svg");
        }

        let myPercentage = clickedBtn.getAttribute('data-important');
        if (myPercentage) {
            if (myPercentage === "100") {
                // The task has already been completed, so use a task completed icon
                $("#taskRocket .rocIcon").attr("src","/img/completedTaskIconWhite.png");
                document.getElementById('taskFinishBtn').style.display = "none";
                if (document.getElementById("taskStartBtn")) {
                    document.getElementById("taskStartBtn").style.display = "none";
                }
                if (document.getElementById("taskFinishBtn")) {
                    document.getElementById("taskFinishBtn").style.display = "none";
                }
                // document.getElementsByClassName("taskStartStopBtn").style.display = "none";
            }else {
                document.getElementById("taskFinishBtn").style.display = "block";
            }
            myPercentage = myPercentage.replace("%", "");
        }
        set('currentTaskPerc', parseInt(myPercentage));

        document.getElementById("taskRocket").style.backgroundColor = myColor;
        document.getElementById("taskProgBar").style.backgroundColor = myPrimColor;
        document.getElementById("taskProgBarPerc").style.background = myColor;
        document.getElementById("taskUpdateBtn").style.background = myColor;
        document.getElementById("taskFinishBtn").style.background = myColor;
        document.getElementById("taskUpdateModalBtn").style.background = myColor;
        document.getElementById("taskDescription").innerHTML = myDescription;
        document.getElementById("jobNumber").innerHTML = myJobId;
        if (myNote === null) {
            document.getElementById("taskTextArea").innerHTML = "No current Update";
        }
        if (myNote) {
            document.getElementById("taskTextArea").innerHTML = myNote;
        }
        if (myPercentage === null) {
            document.getElementById("taskBarPercText").innerHTML = "0%";
            myPercentageInt = 0;
        }
        if (myPercentage) {
            document.getElementById("taskBarPercText").innerHTML = myPercentage + "%";
            myPercentageInt = parseInt(myPercentage);
        }

        let updateSelect = document.getElementById("sch_taskUpdateModal_percentDropDown");
        let updateSelectPerc = myPercentage + "%";
        for (let i, j = 0; i = updateSelect.options[j]; j++) {
            if (i.value == updateSelectPerc) {
                updateSelect.selectedIndex = j;
                break;
            }
        }
        if (myPercentage) {
           // myPercentageInt += 1;
        }

        // console.log("My New Percentage: ", myPercentage);
        if (myPercentageInt === 100) {
            document.getElementById("taskProgBarPerc").style.width = 100 + "%";
        } else {
            document.getElementById("taskProgBarPerc").style.width = myPercentageInt + "%";
        }

        // if Marketing Task ----------------------------
        // This is determined by what icon was clicked
        if(marketingTask){

          // Make sure Notes text area is empty each time a Marketing placard is clicked
          $('.sendPostcardTextArea').val('')
          // And make sure the opt-out checkbox is unchecked by default
          $('.opt-out').prop('checked', false);
          // And reset the contact list select menu to the first option
          $('.selectContact').prop('selectedIndex', 0);

          // Initialize processedList
          let processedList = [];
          set('processedList', processedList);
          set('manualTaskCompPerc', 0);

          // console.log("This is a manual marketing task!");
          // myTasks includes all regular and marketing tasks
          let myTasks = get('myTasks');
          // console.log('myTasks:', myTasks);
          // console.log('Marketing task details:', myTasks[currentIndex]);

          // specific to which manual marketing task was clicked
          let marketingTaskDetails = myTasks[currentIndex];

          //store the Running_ID and Action_ID in a session variable
          let Running_ID = marketingTaskDetails.Running_ID;
          let Action_ID = marketingTaskDetails.Action_ID;
          set('Running_ID', Running_ID);
          set('Action_ID', Action_ID);

          //store the total number of contacts to be processed in a session variable
          let List = marketingTaskDetails.List;
          let numOfContacts = List.length;
          set('numOfContacts', numOfContacts);

          // Create full names in the List
          let full_name = '';
          for(i = 0; i < List.length; i++){
            full_name = List[i].First_Name + ' ' + List[i].Last_Name;
            List[i].full_name = full_name;
          }
          marketingTaskDetails.List = List;
          // activeList starts out as a copy of List
          marketingTaskDetails.activeList = List;
          // console.log('activeList', marketingTaskDetails.activeList);
          set('marketingTaskDetails', marketingTaskDetails);

          // For a given Running_ID:
          // 1. Trim the list of contacts to only those who haven't been processed
          //    by creating a processedList session variable
          // 2. Calculate the percentage complete for the progress bar
          // 3. Create days_ago and E'Expected to take'
          let queryString = "SELECT * from mc_running WHERE Running_ID = " + Running_ID + ";";
          getManualMarketingTaskHistory(queryString, function(taskHistory) {

            // 1. Trim the list of contacts to only those who haven't been processed
            //    by creating a processedList session variable
            // ------------------------------------------------------
            processedList = taskHistory[Action_ID]['processed'];
            // Store the processedList in a session variable to make the select menu reactive
            if (processedList){
              // console.log('processedList 1', processedList);
              set('processedList', processedList);
            }

            if (processedList){
              // console.log('processedList', processedList);
              let activeList = [];
              for(i = 0; i < List.length; i++){
               let completedContact = List[i].Contact_ID;
               // console.log('completedContact', completedContact);
                if(! processedList.includes(parseInt(completedContact))) {
                  activeList.push(List[i]);
                }
              }
              marketingTaskDetails.activeList = activeList;
            }
            set('marketingTaskDetails', marketingTaskDetails);

            // Sort the contacts alphabetically
            let alphabeticalNames = [];
            for(i = 0; i < List.length; i++){
                let fn = List[i].full_name;
                alphabeticalNames.push(fn);
            }
            alphabeticalNames.sort(function(a, b){
              if(a.toUpperCase() < b.toUpperCase()) return -1;
              if(a.toUpperCase() > b.toUpperCase()) return 1;
              return 0;
            })
            // console.log('Alphabetical order for full_names:', alphabeticalNames);

            // Use alphabeticalNames to set the order of the activeList
            let unsortedMarketingTaskDetails = get('marketingTaskDetails');
            let sortedMarketingTaskDetails = [];
            for(i = 0; i < alphabeticalNames.length; i++){
              for(j = 0; j < unsortedMarketingTaskDetails.activeList.length; j++){
                if(unsortedMarketingTaskDetails.activeList[j].full_name === alphabeticalNames[i]){
                  sortedMarketingTaskDetails.push(unsortedMarketingTaskDetails.activeList[j]);
                }
              }
            }

            marketingTaskDetails.activeList = sortedMarketingTaskDetails;
            // console.log('marketingTaskDetails.activeList', marketingTaskDetails.activeList);
            set('marketingTaskDetails', marketingTaskDetails);
            // console.log('marketingTaskDetails after alphabet sort', marketingTaskDetails);

            // 2. Calculate the percentage complete for the progress bar
            // ------------------------------------------------------
            showMarketingProgressBar();

            // 3. Create days_ago and 'Expected to take'
            // ------------------------------------------------------
            // Create 'days_ago'
            let Scheduled_Start = marketingTaskDetails.Scheduled_Start;
            var startDate = new Date(Scheduled_Start);
            var todaysDate = new Date();
            let nDays = diffDays(startDate, todaysDate);
            // console.log("Num days:", nDays);
            marketingTaskDetails.days_ago = nDays;

            // Create 'Expected to take', expressed in Days
            let turnHours = 0;
            let turnDays = 0;
            let turnWeeks = 0;
            let queryString = "SELECT * from mc_actions WHERE Action_ID = " + Action_ID + ";";
            SQLqueryForce(queryString, function(row) {
                // console.log('row contains:', row);
                // console.log('Specs:', row[0].Specs);
                if(row[0].Specs.turn_hours){ turnHours = row[0].Specs.turn_hours; }
                if(row[0].Specs.turn_days) { turnDays = row[0].Specs.turn_days;   }
                if(row[0].Specs.turn_hours){ turnWeeks = row[0].Specs.turn_weeks; }
                // console.log('Add these up:', turnHours, turnDays, turnWeeks);
                let expectedToTake = turnDays + (turnHours / 24) + (turnWeeks * 7);
                // Default to 1 day if nothing is defined in the db
                if(expectedToTake === 0){
                  expectedToTake = 1;
                }
                // Display decimals to only 2 places
                expectedToTake = Number((expectedToTake).toFixed(2));
                marketingTaskDetails.expectedToTake = expectedToTake;
                // console.log('expectedToTake:', expectedToTake);
                set('marketingTaskDetails', marketingTaskDetails);
            });

            // Initialize Percent_Complete to 0
            marketingTaskDetails.Percent_Complete = "0";

            // Set the default contactDetails (Index 0)
            let contactDetails = marketingTaskDetails.activeList[0];;
            set('contactDetails', contactDetails);
            set('marketingTaskDetails', marketingTaskDetails);

          });

          set( 'taskDetails', []);
          set('isMarketingTask', true);

        }
        // A regular task ----------------------------
        else {

          document.getElementById("taskFinishBtn").style.display = "block";
          if (document.getElementById("taskStartBtn")) {
              document.getElementById("taskStartBtn").style.display = "block";
          }

          set('isMarketingTask', false);
          // Run a query to get all task updates
          let getAllUpdatesQuery = "SELECT * FROM ody_job_actions WHERE Detail_ID = " + taskSelected + " Order by Date_Created Desc Limit 10";
          SQLquery(getAllUpdatesQuery, (results) => {
              set('AllTaskUpdates', results);
          });

          taskDetails();

          let updatedJob = get('currentJob');
          let updatedTask = get('currentTask');
          let myTask =  parseInt(updatedTask);
          let myJobId2 = parseInt(updatedJob);
          let getDepartmentsQuery = "select Assigned_To, odyDept.* From ody_job_schedule Inner join ((SELECT Detail_ID, Dept_ID, ws4p.customer_service_department.sort as mySort FROM ody_job_details  INNER JOIN ws4p.customer_service_department ON Dept_ID = ws4p.customer_service_department.ID WHERE ody_job_details.Job_ID = " + myJobId2 + ") as odyDept) on ody_job_schedule.Detail_ID = odyDept.Detail_ID;";
          let depData = [];
          depData.push({qName: 'queryResults', Query: getDepartmentsQuery});
          Meteor.call('fetchFromAPI', 'multi', depData, Session.get('vKey'), function (err, results) {
              if (err) {
                  console.log("Critical Error");
              } else {
                  let departDetails = [];
                  for (let i = 0; i < results.queryResults.length; i++) {
                      departDetails.push(results.queryResults[i]);
                  }
                  // console.log("Getting other departments results: ", results);
                  let jobDepartments = [];

                  departDetails.sort(function (a, b) {
                      return parseInt(a.mySort) - parseInt(b.mySort);
                  });
                  // console.log("sorted Results: ", departDetails);
                  let numItemTotal = departDetails.length;
                  for (let i = 0; i < numItemTotal; i++) {
                      if (parseInt(departDetails[i].Detail_ID) === myTask) {
                          // console.log("Found just completed Task at: ", i);
                          if (i === numItemTotal - 1) {
                              // console.log("Last Item Completed")
                          } else {
                              let nextTask = departDetails[i + 1];
                              let nextEmployee = nextTask.Assigned_To;
                              let nextTaskId = nextTask.Detail_ID;
                          }
                      }
                  }
              }
          });
        } // end else
    },

    'click #taskFinishBtnMarketing': function (e) {
      // The "Finish" button was clicked, so do the following:
      // 1. Update the processed array in the database with all Contacts
      // 2. Update the progress bar to 100%
      // 3. Call manualMarketingTaskComplete(); to make final db updates
      // 4. Set Percent_Complete: 100 in the taskDetails (for the top progress bar)
      e.preventDefault();
      // console.log('The "Finish" button was clicked.');

      let marketingTaskDetails = get('marketingTaskDetails');
      let processedList = get('processedList');
      let Running_ID = get('Running_ID');
      let Action_ID = get('Action_ID');

      // 1. Update the processed array in the database with all Contacts
      let List = marketingTaskDetails.List;
      let contactList = [];
      for(i = 0; i < List.length; i++){
        contactList.push(parseInt(List[i].Contact_ID));
      }
      // console.log('contactList', contactList);
      // The whole list of contacts is now processed
      set('processedList', contactList);

      let queryString = "SELECT * from mc_running WHERE Running_ID = " + Running_ID + ";";
      getManualMarketingTaskHistory(queryString, function(taskHistory) {
          let thisTaskStorage = taskHistory[Action_ID];
          thisTaskStorage["processed"] = contactList;

          // Update the History cell value
          taskHistory[Action_ID] = thisTaskStorage;
          taskHistory = JSON.stringify(taskHistory);
          // console.log('taskHistory AFTER clicking Finish button', taskHistory);

          // Update the mc_running.History cell in the database
          let updateTaskHistory = {
            Table: 'odyssey.mc_running',
            Fields: { History: taskHistory },
            Conditions: { Running_ID: parseInt(Running_ID) }
          };
          // ody.api_call('updateSingleRow', updateTaskHistory);

          Meteor.call('fetchFromAPI', 'updateSingleRow', updateTaskHistory, Session.get('vKey'), function(err, results) {
                  if (err) {
                      console.log('ERROR. usertask.js click #taskFinishBtnMarketing %s',err); console.log(data);
                  } else {
                      // console.log('mc_running History updated');

                      // 2. Update the progress bar to 100%
                      let taskPercUpdate = document.getElementById('taskProgBarPerc').style.width = "100%";
                      let taskPercTxtUpdate = document.getElementById('taskBarPercText').innerHTML = "100%";

                      // 3. Call manualMarketingTaskComplete();
                      manualMarketingTaskComplete();

                      // 4. update "Assigned Task Completed" progress bar
                      taskPercTotal = get('taskPercTotal');
                      let manualTaskCompPerc = get('manualTaskCompPerc');
                      // console.log("manualTaskCompPerc", manualTaskCompPerc);
                      if(manualTaskCompPerc < 100){ // allow once
                        taskPercTotal += (100 - manualTaskCompPerc); // remaining balance
                        // console.log("taskPercTotal", taskPercTotal);
                        set('taskPercTotal', taskPercTotal);

                        // Update the Assigned Tasks Completed bar
                        updateAssignedTasksCompleted();

                      }
                      set('manualTaskCompPerc', 100);

                      // 5. Update Total Tasks completed this week
                      let taskCompletedThisWeek = get('taskCompletedThisWeek');
                      taskCompletedThisWeek++;
                      set('taskCompletedThisWeek', taskCompletedThisWeek);

                  }
              });

      });

    },

    'click .marketingTaskContactComplete': function (e) {
      // The user has clicked the "Complete" button on the right side of
      // the manual marketing task details, meaning this contact has been completed
      // Here we will capture any notes, opt-out., and update the database
      e.preventDefault();
      // console.log('Complete button has been clicked.');

      let contactDetails = get('contactDetails');
      // console.log("contactDetails", contactDetails);
      let marketingTaskDetails = get('marketingTaskDetails');
      let Running_ID = get('Running_ID');
      let Action_ID = get('Action_ID');

      let Contact_ID = contactDetails.Contact_ID;

      // Capture notes and opt-outs
      let notes = $('.sendPostcardTextArea').val().trim();
      let opt_out = $('.opt-out').is(':checked');

      // console.log("Contact_ID:", Contact_ID);
      // console.log("Action_ID:", Action_ID);
      // console.log("notes:", notes);
      // console.log("opt_out:", opt_out);

        // Update the database
      let queryString = "SELECT * from mc_running WHERE Running_ID = " + Running_ID + ";";
      getManualMarketingTaskHistory(queryString, function(taskHistory) {
          // console.log('History passed back:', taskHistory);
          let thisTaskStorage = taskHistory[Action_ID];

          // Update "processed" array
          // Get the processed array from the database
          let processed = thisTaskStorage['processed'];
          if(processed && processed instanceof Array){
            // JSON key 'processed' already exists and it contains an array
            if(! processed.includes(parseInt(Contact_ID))) {
              // If the Contact_ID is not already in the processed array, add it
              processed.push(parseInt(Contact_ID));
            }
          } else {
            processed = [parseInt(Contact_ID)];
          }
          thisTaskStorage["processed"] = processed;
          // update the session variable also
          set('processedList', processed);

          // Update opt-out: ie. "opt_out":{"698959":true,"704879":true}
          let storedOptout = thisTaskStorage['opt_out'];
          if(opt_out && storedOptout instanceof Object) {
            storedOptout[Contact_ID] = true;
          } else if (opt_out) {
            storedOptout = {};
            storedOptout[Contact_ID] = true;
          }
          thisTaskStorage['opt_out'] = storedOptout;

          // Add note, if applicable
          let storedNotes = thisTaskStorage['notes'];
          if(notes && storedNotes instanceof Object){
            // "notes" already found in the db, so add a new key-value pair
            storedNotes[Contact_ID] = notes;
            // console.log('storedNotes', storedNotes);
          } else if (notes) {
            // Notes not yet found in the db, so create a new dictionary for them
            storedNotes = {};
            storedNotes[Contact_ID] = notes;
          }
          thisTaskStorage['notes'] = storedNotes;
          // console.log('thisTaskStorage AFTER', thisTaskStorage);

          // Update the History cell value
          taskHistory[Action_ID] = thisTaskStorage;
          taskHistory = JSON.stringify(taskHistory);
          // console.log('taskHistory AFTER', taskHistory);

          // Update the mc_running.History cell in the database
          let updateTaskHistory = {
            Table: 'odyssey.mc_running',
            Fields: { History: taskHistory },
            Conditions: { Running_ID: parseInt(Running_ID) }
          };
          ody.api_call('updateSingleRow', updateTaskHistory);

          // Update the mc_running_contacts.Active cell in the database if the contact clicked 'opt-out'
          if(opt_out){
            let toggleActive = {
              Table: 'odyssey.mc_running_contacts',
              Fields: { Active: 0 },
              Conditions: { Running_ID: parseInt(Running_ID), Contact_ID: parseInt(Contact_ID) }
            };
            ody.api_call('updateSingleRow', toggleActive);
          }

          // Update the Progress Bar and Percentage
          updateMarketingProgressBar( Running_ID, Action_ID);

          // Update activeList, to make the select menu shrink reactively
          let marketingTaskDetails = get('marketingTaskDetails');
          let activeList = marketingTaskDetails.activeList;
          let newActiveList = [];
          let processedList = get('processedList');
          // console.log("processedList now contains:", processedList);
          for(i = 0; i < activeList.length; i++){
            let activeContact = activeList[i].Contact_ID;
            // console.log('activeContact', activeContact);
            if(! processedList.includes(parseInt(activeContact))) {
              newActiveList.push(activeList[i]);
            }
          }
          // console.log('New activeList', newActiveList);
          marketingTaskDetails.activeList = newActiveList;
          set('marketingTaskDetails', marketingTaskDetails);

          // Update the contact details to the next auto-selected contact
          let newSelectedIndex = $('.selectContact').prop('selectedIndex');
          let newNumOptions = $(".selectContact option").length -1;
          // console.log("New Selected Index:", newSelectedIndex);
          // console.log("New number of options:", newNumOptions);
          if(newSelectedIndex === newNumOptions){
            // console.log("Last option was selected, so reset newSelectedIndex to 0");
            newSelectedIndex = 0;
          }
          marketingTaskDetails = get('marketingTaskDetails');
          // console.log("New marketingTaskDetails:", marketingTaskDetails);
          let List = marketingTaskDetails['activeList'];
          contactDetails = List[newSelectedIndex];
          set('contactDetails', contactDetails);
          // console.log("New contactDetails:", contactDetails);
          // Make sure Notes text area is empty each time a new contact is selected
          $('.sendPostcardTextArea').val('')
          // And make sure the opt-out checkbox is unchecked by default
          $('.opt-out').prop('checked', false);

      });

    },

    'click #taskUpdateBtn': function (e) {
        e.preventDefault();
        let newModal = document.getElementById("updateModal");
        newModal.style.display = "block";
    },
    'click .sch_taskUpdateModal_Cancel': function (e) {
        e.preventDefault();
        let newModal = document.getElementById("updateModal");
        newModal.style.display = "none";

    },
    'click .sch_taskUpdateModal_Update': function (e) {
      // The "Update Progress" button has been clicked
      // So lets change percent complete for this task (curPct) from current value to new value
      //    and update the taskPercTotal
      // taskPercTotal is the total percentage complete of ALL active tasks combined. It is
      //    what is used to calculate the Assigned Tasks Completed percentage

      e.preventDefault();

      // Find out which task we are updating
      let updatedTask = get('currentTask');
      let updatedJob = get('currentJob');

      // Gather task information from the dom
      let domElements = document.getElementById(updatedTask);
      let myNewNote = document.getElementById("taskTextArea").value;
      let newModal = document.getElementById("updateModal");
      let selectedPercent = document.getElementById("sch_taskUpdateModal_percentDropDown");
      let newPercCompText = selectedPercent.options[selectedPercent.selectedIndex].text;
      let newPercComplete = parseInt(newPercCompText.replace("%", ""));
      // console.log("The newPercCompText is:", newPercCompText);
      // console.log("The newPercComplete is:", newPercComplete);

      // Get the current percent complete for this task from the dom
      let curPct = parseInt( domElements.getAttribute('data-important') );
      // if the current percent complete is NaN, set it to zero
      if( isNaN( curPct ) ) curPct = 0;
      // console.log("Current percent", curPct);

      // Set the new percent complete for this task in the dom
      domElements.setAttribute('data-type', myNewNote);
      domElements.setAttribute('data-important', parseInt(newPercComplete));

      // The task has already been marked complete (100%), but now the Update Progess
      // button has been clicked. The user is changing their mind.
      if(curPct === 100) {
        undoFinish();
      }

      document.getElementById('taskProgBarPerc').style.width = newPercCompText;
      document.getElementById('taskBarPercText').innerHTML = newPercCompText;

      // Update the Assigned Tasks Completed bar
      let taskPercTotal = get('taskPercTotal');
      let totalNumTasks = get('totalNumTasks');
      let taskPercentDiff = newPercComplete - curPct;
      // console.log("The Difference is:", taskPercentDiff);
      taskPercTotal = taskPercTotal + taskPercentDiff;
      set('taskPercTotal', taskPercTotal);
      let finalAssignedPerc = taskPercTotal / totalNumTasks;
      // console.log('finalAssignedPerc, taskPercTotal, totalNumTasks', finalAssignedPerc, taskPercTotal, totalNumTasks );
      if (finalAssignedPerc === NaN) {
          finalAssignedPerc = 0;
      }
      finalAssignedPerc = Math.round(finalAssignedPerc);
      let strAssignPerc = finalAssignedPerc.toString();
      strAssignPerc += "%";
      set('assCompPerc', strAssignPerc);

      // Set up record details for the database update:
      let record = {};
      record.Job_ID = parseInt(updatedJob);
      record.Detail_ID = parseInt(updatedTask);
      record.Type = "percent";
      record.Action_By = parseInt( ody.get_userid() );
      record.Percent_Complete = parseInt(newPercComplete);
      record.Note = myNewNote;
      let date;
      date = new Date();
      date = date.getUTCFullYear() + '-' +
          ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
          ('00' + date.getUTCDate()).slice(-2) + ' ' +
          ('00' + date.getUTCHours()).slice(-2) + ':' +
          ('00' + date.getUTCMinutes()).slice(-2) + ':' +
          ('00' + date.getUTCSeconds()).slice(-2);
      record.Date_Created = date;

      let data = {
          Table: 'ody_job_actions',
          Fields: record
      };

      // Update the database with the new percent complete
      ody.api_call('addSingleRow', data, function (result) {
        if (result.error) {
          ody.alert(result.error);
          let newModal = document.getElementById("updateModal");
        } else {
          let newModal = document.getElementById("updateModal");

          let getAllUpdatesQuery = "SELECT * FROM ody_job_actions WHERE Detail_ID = " + updatedTask + " Order by Date_Created Desc Limit 10";
          SQLquery(getAllUpdatesQuery, (results) => {
            set('AllTaskUpdates', results);
          });
        }
        newModal.style.display = "none";
      });


    },
    'change .selectContact': function(e){
      e.preventDefault();
      let contact = $(e.target).val();
      let selectedIndex = $(e.target).prop('selectedIndex');

      // Subtract one because of the --select-- at the top of the select menu (if used)
      // selectedIndex = selectedIndex -= 1;

      // console.log("New contact:", contact, "has been chosen.");
      // console.log("Selected Index:", selectedIndex);
      let marketingTaskDetails = get('marketingTaskDetails');
      let List = marketingTaskDetails['activeList'];
      // console.log("List contains:", List);
      let contactDetails = List[selectedIndex];
      set('contactDetails', contactDetails);
      // console.log("contactDetails:", contactDetails);
      // Make sure Notes text area is empty each time a new contact is selected
      $('.sendPostcardTextArea').val('')
      // And make sure the opt-out checkbox is unchecked by default
      $('.opt-out').prop('checked', false);
    },

    'change #taskSelect': function (e) {
      e.preventDefault();
      let newFilter = $(e.target).val();
      loadUserTaskData( newFilter, function() {
        switch( newFilter ) {
          case 'assignedToMe':
            set( 'usrsTsks', get( 'myTasks' ) );
            break;
          case 'unassigned':
            set( 'usrsTsks', get( 'unassignedTasks' ) );
            break;
          default:
            let unassTsks = get('unassignedTasks');
            let assToUsrTsks = get('myTasks');
            let allTasks = unassTsks.concat(assToUsrTsks);
            //@todo sort allTasks
            allTasks.sort(function (a, b) {
               return new Date(a.Scheduled_Start) - new Date(b.Scheduled_Start);
            });
            // console.log("All Tasks: ", allTasks);
            set('usrsTsks', allTasks);
        };
      });
    },
    'click .taskStartStopBtn': function (e) {
        e.preventDefault();
        let $this = $( e.currentTarget );
        let start = $this.is( '#taskStartBtn' );
        let updatedTask = get('currentTask');
        let updatedJob = get('currentJob');
        let date;
        date = new Date();
        date = date.getUTCFullYear() + '-' +
            ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
            ('00' + date.getUTCDate()).slice(-2) + ' ' +
            ('00' + date.getUTCHours()).slice(-2) + ':' +
            ('00' + date.getUTCMinutes()).slice(-2) + ':' +
            ('00' + date.getUTCSeconds()).slice(-2);
        let record = {};
        record.Job_ID = parseInt(updatedJob);
        record.Detail_ID = parseInt(updatedTask);
        record.Type = "stop";
        record.Action_By = ody.get_userid();
        if (start) {
          record.Note = "Task started";
          record.Type = "start";
        } else {
          record.Note = "Task paused";
        }
        record.Date_Created = date;
        record.Percent_Complete = get('currentTaskPerc');
        let data = {
          Table: 'ody_job_actions',
          Fields: record
        };

        ody.api_call('addSingleRow', data, function (result) {
            if (result.error) {
                // console.log("Critical Error on Stopping");
            } else {
              let taskSelected = get('currentTask');
              let getAllUpdatesQuery = "SELECT * FROM ody_job_actions WHERE Detail_ID = " + taskSelected + " Order by Date_Created Desc Limit 10";
              SQLquery(getAllUpdatesQuery, (results) => {
                  set('AllTaskUpdates', results);
                  // console.log('All Current Tasks Updates for this task: ', results);
              });
              if( start ) {
                let rec = {
                  Table: 'odyssey.ody_job_details',
                  Fields: {
                    Assigned_To: ody.get_userid()
                  },
                  Conditions: {
                    Detail_ID: parseInt(updatedTask)
                  }
                };
                ody.api_call( 'updateSingleRow', rec, function( result2 ) {
                  if( result2 && ! result2.error ) {
                    let unassigned = get( 'unassignedTasks' );
                    let assigned = get( 'usrsTsks' );
                    let task = null;
                    for( let i = unassigned.length - 1; i >= 0; i-- ) {
                      let uTask = unassigned[i];
                      if( parseInt( uTask.Detail_ID ) === parseInt( updatedTask ) ) {
                        task = ody.copy( uTask );
                        unassigned.splice( i, 1 );
                        break;
                      }
                    }
                    if( task ) {
                      assigned.splice( 0, 0, task );
                      set( 'unassignedTasks', unassigned );
                      //@todo sort assigned
                        assigned.sort(function (a, b) {
                            return a.Scheduled_Start - b.Scheduled_Start;
                        });
                      set( 'usrsTsks', assigned );
                    }
                  }
                });
              }
            }
        });

    },

    // Clicked the "Finish" button
    'click #taskFinishBtn': function (e) {
        e.preventDefault();
        let updatedTask = get('currentTask');
        let updatedJob = get('currentJob');
        let curIndex = get('currentIndex');
        // console.log('updatedTask', updatedTask);
        // console.log('updatedJob', updatedJob);
        // console.log('curIndex', curIndex);
        let myTasks = get('myTasks');

        // Get the current percent complete for this task from the dom
        let domElements = document.getElementById(updatedTask);
        let curPct = parseInt( domElements.getAttribute('data-important') );
        // if the current percent complete is NaN, set it to zero
        if( isNaN( curPct ) ) curPct = 0;
        // console.log("Current percent", curPct);

        domElements.setAttribute('data-important', 100); // What does this line do?
        domElements.setAttribute('data-type', "Changed status to complete");

        // Make the "Finish" button disappear
        document.getElementById('taskFinishBtn').style.display = "none";

        // Make "Start" and/or "Stop" buttons disappear
        if (document.getElementById("taskStopBtn")) {
            document.getElementById("taskStopBtn").style.display = "none";
        }
        if (document.getElementById("taskStartBtn")) {
            document.getElementById("taskStartBtn").style.display = "none";
        }
        // domElements.setAttribute('data-important', 100);
        // domElements.setAttribute('data-type', "Changed status to complete");

        // Change the rocket icon to a white checkmark icon
        $("#" + updatedTask + " .rocIcon").attr("src","/img/completedTaskIconWhite.png");
        $("#taskRocket .rocIcon").attr("src","/img/completedTaskIconWhite.png");


        let currentTaskOrder = get('usrsTsks');
        let myNewNote = document.getElementById("taskTextArea").value;
        let taskPercUpdate = document.getElementById('taskProgBarPerc').style.width = "100%";
        let taskPercTxtUpdate = document.getElementById('taskBarPercText').innerHTML = "100%";

        // Get the userid of this user
        let thisUser = ody.get_userid();

        // Prepare the single row database insert
        let date = new Date();
        date = date.getUTCFullYear() + '-' +
            ('00' + (date.getUTCMonth() + 1)).slice(-2) + '-' +
            ('00' + date.getUTCDate()).slice(-2) + ' ' +
            ('00' + date.getUTCHours()).slice(-2) + ':' +
            ('00' + date.getUTCMinutes()).slice(-2) + ':' +
            ('00' + date.getUTCSeconds()).slice(-2);
        let record = {};
        record.Job_ID = parseInt(updatedJob);
        record.Detail_ID = parseInt(updatedTask);
        record.Type = "percent";
        record.Percent_Complete = 100;
        record.Note = "Changed status to complete";
        record.Date_Created = date;
        record.Action_By = thisUser;
        let data = {
            Table: 'ody_job_actions',
            Fields: record
        };

        // Add a row to the ody_job_actions table in the database
        ody.api_call('addSingleRow', data, function (result) {
            if (result.error) {
                console.log("Error in addSingleRow ody.api_call - usertask.js.");
            } else {
                // ody.alert("Congratulations on finishing the task!");  // Do we really need this?
            }
        });
        let myTask =  parseInt(updatedTask);
        let myJobId = parseInt(updatedJob);

        // Run department query and send notification
        let getDepartmentsQuery = "SELECT Assigned_To, odyDept.* FROM ody_job_schedule INNER JOIN ((SELECT Detail_ID, Dept_ID, ws4p.customer_service_department.sort AS mySort FROM ody_job_details INNER JOIN ws4p.customer_service_department ON Dept_ID = ws4p.customer_service_department.ID WHERE ody_job_details.Job_ID = " + myJobId + ") AS odyDept) ON ody_job_schedule.Detail_ID = odyDept.Detail_ID;";
        let depData = [];
        depData.push({qName: 'queryResults', Query: getDepartmentsQuery});
        Meteor.call('fetchFromAPI', 'multi', depData, Session.get('vKey'), function (err, results) {
            if (err) {
                console.log("Critical Error");
            } else {
                let departDetails = [];
                for (let i = 0; i < results.queryResults.length; i++) {
                    departDetails.push(results.queryResults[i]);
                }
                // console.log("Getting other departments results: ", results);
                let jobDepartments = [];

                departDetails.sort(function (a, b) {
                    return parseInt(a.mySort) - parseInt(b.mySort);
                });
                // console.log("sorted Results: ", departDetails);
                let numItemTotal = departDetails.length;
                for (let i = 0; i < numItemTotal; i++) {
                    if (parseInt(departDetails[i].Detail_ID) === myTask) {
                        // console.log("Found just completed Task at: ", i);
                        if (i === numItemTotal - 1) {
                            // console.log("Last Item Completed")
                        } else {
                            let nextTask = departDetails[i + 1];
                            let nextEmployee = nextTask.Assigned_To;
                            let nextTaskId = nextTask.Detail_ID;
                            if (nextEmployee.Assigned_To != "0") {
                                let data = {Type_ID: 19, Ref_ID: nextTaskId, To_ID: nextEmployee};
                                //let Ref_ID = nextEmployee.Detail_ID;
                                ody.api_call('addNotification', data, function (result) {
                                    // console.log(result);
                                });
                            }
                        }
                    }
                }
            }
        });
        // In addition to setting Percent_Complete to 100 in the actions table,
        // set Completed = 1 in the details table. (ODY-738)
        // Call ody.api_call with the argument of 'updateSingleRow' and the details of the update

        // Set up the details for the row update in a dictionary called markCompleted:
        // 1. Table
        // 2. Fields (column)
        // 3. Conditions (where conditions)
        let markCompleted = {
          Table: 'odyssey.ody_job_details',
          Fields: { Completed: 1 },
          Conditions: { Detail_ID: parseInt(updatedTask) }
        };
        ody.api_call('updateSingleRow', markCompleted);

        // update the ody_job_details table so that the user who clicked Finished
        // for this task is now listed under Assigned_To
        let assignUserIDtoDetails = {
          Table: 'odyssey.ody_job_details',
          Fields: { Assigned_To: thisUser },
          Conditions: { Detail_ID: parseInt(updatedTask) }
        };
        ody.api_call('updateSingleRow', assignUserIDtoDetails);

        // Incremement taskCompletedThisWeek
        taskCompletedThisWeek = get('taskCompletedThisWeek');
        taskCompletedThisWeek++;
        set('taskCompletedThisWeek', taskCompletedThisWeek);
        let currentJob = parseInt(updatedJob);

        // Update "Assigned Tasks Completed" progress bar
        let taskPercTotal = get('taskPercTotal');
        let addPercentDiff = 100 - curPct;
        taskPercTotal += addPercentDiff;

        set('taskPercTotal', taskPercTotal);
        set('totalNumTasks', totalNumTasks);
        // console.log('taskPercTotal', taskPercTotal );
        // console.log('totalNumTasks', totalNumTasks );

        let finalAssignedPerc = taskPercTotal / totalNumTasks;
        // console.log('finalAssignedPerc, taskPercTotal, totalNumTasks', finalAssignedPerc, taskPercTotal, totalNumTasks );
        if (finalAssignedPerc === NaN) {
            finalAssignedPerc = 0;
        }
        finalAssignedPerc = Math.round(finalAssignedPerc);
        let strAssignPerc = finalAssignedPerc.toString();
        strAssignPerc += "%";
        set('assCompPerc', strAssignPerc);

    }
});

function undoFinish() {
  // When the user has clicked "Finish" on a task and the task is still in the active list
  // because the page hasn't yet been refreshed, the user can still undo the finish status
  // by clicking the "Update Progress" button and change the percent complete to something less
  // than 100%. This function takes care of the details of resetting a finished task back to
  // an in progress task.

  // console.log('undoFinish');
  let updatedTask = get('currentTask');

  // Change back to the rocket icon from a white checkmark icon
  $("#" + updatedTask + " .rocIcon").attr("src","/img/rocket_white.svg");
  $("#taskRocket .rocIcon").attr("src","/img/rocket_white.svg");

  // Make the "Finish" button re-appear
  document.getElementById('taskFinishBtn').style.display = "block";

  // Make "Start" and/or "Stop" buttons re-appear
  if (document.getElementById("taskStopBtn")) {
      document.getElementById("taskStopBtn").style.display = "block";
  }
  if (document.getElementById("taskStartBtn")) {
      document.getElementById("taskStartBtn").style.display = "block";
  }

  // Decrement Total Tasks completed this week
  let taskCompletedThisWeek = get('taskCompletedThisWeek');
  // console.log('Number of tasks completed this week is set to:', taskCompletedThisWeek)
  taskCompletedThisWeek--;
  set('taskCompletedThisWeek', taskCompletedThisWeek);

}

Template.usertask.helpers({
    tasksLoaded: function() {
      return get( 'loaded' );
    },
    isMarketingTask: function() {
      return get('isMarketingTask');
    },
    manualMarketingTaskComplete: function(){
      return get('manualMarketingTaskComplete');
    },
    getUserPic: function () {
        let user = ody.collections.user.findOne();
        if (hasOwnProperty.call(user, 'data')) {
            user = user.data;
        }
        let photoDir = user.Webshop_Base + user.Dir + "/" + "130xf" + "/" + user.Photo;
        return photoDir;
    },

    getUsrTasks: function () {
        let usersTasks = get('usrsTsks');
        if (usersTasks.length === 0) {
            return .8;
        }

        // console.log("User Tasks Helper: ", usersTasks);
        var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        Date.prototype.sameDay = function(d) {
            return this.getFullYear() === d.getFullYear()
                && this.getDate() === d.getDate()
                && this.getMonth() === d.getMonth();
        }


        //let firstDate = new Date(usersTasks[0].Scheduled_Start);
        let firstDate = moment(usersTasks[0].Scheduled_Start.toString(), 'YYYY-MM-DD HH:mm').toDate();
        // console.log("First Date Safari: ", firstDate);
        let firstDayBreak = days[firstDate.getDay()];
        let firstMonthBreak = months[firstDate.getMonth()];
        let firstDateBreak = firstDate.getDate().toString();
        let firstYearBreak = firstDate.getFullYear().toString();
        let iconImage = '';
        let tmpDate, nextDate, dayBreak, monthBreak, tmpDateBreak, yearBreak, dateBreak = '';

        let firstDateFormatted = firstDayBreak + ", " + firstMonthBreak + " " + firstDateBreak + ", " + firstYearBreak;
        usersTasks[0].firstTask = true;
        usersTasks[0].firstScheduledDate = firstDateFormatted;

        for (let i = 0; i < usersTasks.length - 1; i++) {  // why - 1 ?
        // for (let i = 0; i < usersTasks.length; i++) {
            usersTasks[i].iconImage = '/img/rocket_white.svg';

            let tmpDate = new Date(usersTasks[i].Scheduled_Start);
            tmpDate = moment(usersTasks[i].Scheduled_Start, 'YYYY-MM-DD HH:mm').toDate();

            let nextDate = new Date(usersTasks[i + 1].Scheduled_Start);
            nextDate = moment(usersTasks[i + 1].Scheduled_Start, 'YYYY-MM-DD HH:mm').toDate();

            // // console.log("DATE TYPE: ", typeof(tmpDate));
            // // console.log("My TMP DATE: ", tmpDate);
            // // console.log("Formatted Date: ", tmpDate.toLocaleDateString("en-US"));
            if (tmpDate.sameDay(nextDate)) {
                // console.log("WE FOUND TWO TASKS ON THE SAME DAY!!!!");

            } else {
                usersTasks[i].newDateBreak = true;
                dayBreak = days[nextDate.getDay()];
                monthBreak = months[nextDate.getMonth()];
                tmpDateBreak = nextDate.getDate().toString();
                yearBreak = nextDate.getFullYear().toString();
                dateBreak = dayBreak + ", " + monthBreak + " " + tmpDateBreak + ", " + yearBreak;
                usersTasks[i].newTaskScheduDate = dateBreak;
            }

            //@todo extract dates from two tasks to be compared
           //
        }
        // console.log("usersTasks AFTER: ", usersTasks);
        return usersTasks;


    },

    getAssCompPerc: function () {
        let renderedPerc = get('assCompPerc');
        if (renderedPerc === "NaN%") {
            return "";
        } else {
            return renderedPerc;
        }

    },
    getTasksCompletedThisWeek: function () {
        let tasksCompleted = get('taskCompletedThisWeek');
        return tasksCompleted;
    },
    getTaskColors: function () {
        let colors = getTaskColors();
        return colors;
    },

    getInProgressPercentage: function () {
        let finalInProgPerc = get('inProgPercentage');
        return finalInProgPerc;
    },

    getCompletedEarly: function () {
        let completedEarlyPerc = get('completedErly');
        return completedEarlyPerc;
    },

    getAllTaskUpdates: function () {
        let allUpdates = get('AllTaskUpdates');
        return allUpdates;
    },

    // Called by the template to determine whether to display start/stop buttons
    taskFinished : function() {
        let actions = get('AllTaskUpdates');
        if (actions && actions.length) {
            for (let i = 0; i < actions.length; i++) {
                let act = actions[i];
                if (act.Type === "Changed status to Complete") return false;
                else return true;
            }
        }
        else {
            return true;
        }
    },

    taskStarted: function() {
      let actions = get( 'AllTaskUpdates' );
      if( actions && actions.length ) {
        for( let i = 0; i < actions.length; i++ ) {
          let act = actions[i];
          if( act.Type === "start" ) return true;
          if( act.Type === "stop" ) return false;
        }
      }
    },

    formattedNote: function() {
      let data = Template.currentData();

      let note = null;
      if( data && data.Note ) {
        note = data.Note;
        if( note.length && note.substr( 0, 1 ) === "{" ) {
          note = JSON.parse( note );
          if( note && typeof note === "object" ) {
            let formatted = "";
            for( let key in note ) {
              formatted += "" + key + ": " + note[key] + "<br>";
            }
            if( formatted != "" ) return formatted;
            else note = data.Note;
          } else {
            note = data.Note;
          }
        }
      }
      return note;
    },

    taskDetails: function() {
      return get( 'taskDetails' );
    },

    marketingTaskDetails: function() {
      return get('marketingTaskDetails');
    },

    contactDetails: function() {
      return get( 'contactDetails' );
    },

    animate_percentages: function() {
      let inst = Template.instance();
      let renderedPerc = get('assCompPerc');
      let finalInProgPerc = get('inProgPercentage');
      Meteor.defer( function() {
        if( inst ) {
          let assComp = $( inst.find( '.assignedTaskPerc' ) );
          assComp.removeAttr( 'style' );
          if( renderedPerc ) assComp.css( 'width', renderedPerc );

        }
      });
    },
});

export const SQLquery = function(queryString, callback) {
  Meteor.call( 'forceFromAPI', 'queryResults', { Query: queryString }, ody.get_vKey(), function (err, results) {
    if ( ! results ) {
      // report error
      // // console.log('Error: job_status_bar.js line 13 %s', err);
    } else {
      if( results.error ) {
          let tmp = 0;
      } // console.log('Error: ', results.error );
      else if (Array.isArray(results)) {
        callback(results);
      }
    }
  });
}

export const taskDetails = function() {
  let taskSelected = get('currentTask');
  // console.log('taskSelected', taskSelected);
  if( taskSelected ) {
    let detailQuery = "SELECT ody_jobs.Order_Number, IF( IFNULL( ody_jobs.Job_Number, 0 ) = 0, NULL, LPAD( ody_jobs.Job_Number, 2, '0' ) ) AS Job_Number, ody_jobs.Contact_ID, ody_jobs.Company_ID, ody_jobs.Components, ody_jobs.Description AS Job_Description, ody_jobs.Quantity, ody_jobs.Main_Info, ody_jobs.Other_Info, ody_job_details.* FROM odyssey.ody_job_details INNER JOIN odyssey.ody_jobs USING( Job_ID ) WHERE Detail_ID = " + taskSelected;
    ody.api_call( 'queryResults', { Query: detailQuery }, function( results ) {
      if( results && Array.isArray( results ) && results.length ) {
        let row = results[0];
        let op = [];
        let cix = parseInt( row.Component ) - 1;
        let components = JSON.parse( row.Components );
        let component = components[cix];
        let Quantity = parseInt( row.Quantity );
        let type = row.Type;
        let other_info = row.Other_Info;
        if ( typeof(other_info) === 'string') other_info = JSON.parse(other_info);
        let col = get_col_from_component( Quantity, component );
        let detail = { Component: component.component_description };
        let info = JSON.parse( row.Main_Info );
        let list = [];
        if( info ) {
          if( info.contact_name ) {
            detail.Contact = info.contact_name;
            list.push({'label': 'Contact', 'value': info.contact_name});
          }
          if( info.company_name ) {
            detail.Company = info.company_name;
            list.push({'label': 'Company', 'value': info.company_name});
          }
        }

        let resource_id = parseInt( row.Resource_ID );

        var job_other_info = function( n ) {
          if ( ! other_info ) return '';

          if ( Array.isArray( other_info ) ) {
              // newer format (2/28/17) has other_info as an array
              // with component # as the index
              // older format is just an object
              if ( cix < other_info.length ) {
                other_info = other_info[cix];
                if ( other_info[n] ) {
                  return other_info[n];
                }
              }
          } else {
            if ( other_info[n] ) return other_info[n];
          }
          return '';
        };

        var add_jobticket_notes = function( list ) {
          // we may have special job ticket notes added by a calculation
          if ( ! resource_id ) return;
          if ( ! Array.isArray( other_info ) || cix >= other_info.length ) return;
          let other = other_info[cix];
          if ( ! other.job_ticket || ! other.job_ticket[ resource_id ] ) return;
          var msg = other.job_ticket[ resource_id ];
          list.push( { label: 'Special Instructions', value: msg } );
        };

        var add_resource_details = function( list ) {
          // add resource details to list for this resource
          if ( ! resource_id ) return;
          var sid = resource_id.toString();
          var col = get_col_from_component( Quantity, component );
          var info = ody.est_component_info();  // component entry questions
          var obj = {};
          var count = 0;
          for ( key in component ) {
              if (component.hasOwnProperty(key)) {
                  var t = key.split('_');
                  var ix = t.indexOf(sid);
                  if ( ix > 0 ) {
                      t.splice( 0,ix+1 );
                      if ( t[ t.length-1 ] === col.toString() ) {
                          var t = key.split('_');
                          t.splice( t.length-1, 1);
                          obj[ t.join('_') ] = { value: component[key] };
                          count += 1;
                      }
                  }
              }
          }

          if ( count === 0 ) return; // nothing found for this task

          // add task description to info shown if available
          add_task_to_obj( obj, sid, component );

          var info_obj = {};
          for ( var i=0; i < info.length; i++ ) {
              var columns = info[i].columns;
              for ( var i2=0; i2 < columns.length; i2++ ) {
                  var rows = columns[i2].rows;
                  for ( var i3=0; i3 < rows.length; i3++ ) {
                      var row = rows[i3];
                      if ( obj[ row.name ] ) {
                          // we found one that is specified
                          obj[ row.name ].label = row.label;
                          obj[ row.name ].sort = ( i * 10000 ) + (i2 * 1000) + i3;
                      }
                  }
              }
          }

          // convert object to array
          var tlist = [];
          for ( key in obj ) {
            if (obj.hasOwnProperty(key)) {
              var v = obj[key];
              tlist.push( { sort: v.sort, label: v.label, value: v.value } );
            }
          }

          tlist.sort( function(a,b) {
            if ( a.sort < b.sort ) return -1;
            if ( a.sort > b.sort ) return 1;
            return 0;
          } );

          for ( i=0; i < tlist.length; i++ ) {
            list.push( { label: tlist[i].label, value: tlist[i].value } );
          }
        };

        var add_task_to_obj = function( obj, sid, component ) {
          // obj holds an object like obj[ fold_2336_fold ] = { value:2, label: '# of folds', sort: 117 }

          var tasks = component.TasksApplied;
          if ( tasks && typeof(tasks) === 'object' ) {
            let task = '';
            for ( let key in tasks ) {
              if ( ody.hasOwnProperty( tasks, key ) ) {
                if ( parseInt(key) === resource_id ) {
                  task = tasks[key];
                  break;
                }
              }
            }
            if ( task ) {
              // yes, we have used a task for this resource
              let desc = task.description.split(':');
              if ( desc.length > 1 ) {
                  desc = desc[1];
              } else {
                  desc = desc[0];
              }
              // get "name" of the resource
              let n = '';
              for ( let key in obj ) {
                if ( ody.hasOwnProperty( obj, key ) ) {
                  n = key.split('_')[0];
                  break;
                }
              }
              let key = sprintf('%s_%s_task',n,sid);
              obj[ key ] = { value: desc, label: 'Task', sort: 1 };
            }
          }
        };

        let show = function(field, label, special) {
          if ( special ) {
              switch ( special ) {
              case 'bleeds':
              let bleeds = 'No';
              for ( i=0; i < 4; i++ ) {
                  if ( parseFloat( component[ sprintf('bleeds_%s',i) ] ) > 0 ) {
                      bleeds = 'Yes';
                      break;
                  }
              }
              if ( parseFloat( component.gutter ) > 0 ) bleeds = 'Yes';
              list.push( { label: label, value: bleeds } );
              break;

              case 'size':
              var sz1 = component[ sprintf('%s_width',field) ];
              if ( ! sz1 ) sz1 = component[ sprintf('%s_width_%s',field,col) ];
              var sz2 = component[ sprintf('%s_length',field) ];
              if ( ! sz2 ) sz2 = component[ sprintf('%s_length_%s',field,col) ];
              sz1 = ody.remove_trailing_zeros( sz1 );
              sz2 = ody.remove_trailing_zeros( sz2 );
              if ( sz1 && sz2 ) {
                  list.push( { label: label, value: sprintf('%s x %s', sz1, sz2) } );
              }
              break;

              case 'boolean':
              var v = component[ field ];
              if ( typeof(v) === 'undefined' ) v = component[ sprintf('%s_%s',field, col) ];
              if ( parseInt(v) ) {
                  v = 'Yes';
              } else {
                  v = 'No';
              }
              list.push( { label: label, value: v } );
              break;

              }
          } else {
              var v = component[ field ];
              if ( ! v ) v = component[ sprintf('%s_%s',field, col) ];
              if ( v ) {
                  list.push( { label: label, value: v } );
              }
          }
        };

        show('quantities', 'Finished Quantity');

        var add_default = function() {
          // add default values that will appear on most tasks
          show('Press_Description', 'Press');  // name, label
          show('p1_stock_size', 'Stock Size', 'size');
          show('press_sheet_size', 'Press Sheet Size', 'size');
          show('finished_size', 'Finished Size', 'size');

          show('wf_production_size', 'Production Size', 'size');
          show('wf_trim_size', 'Trim Size', 'size');
          show('wf_view_size', 'View Size', 'size');

          show('press_up', '# up on press');
          list.push( { label: 'Press Sheets', value: job_other_info('press_sheets') } );
          var nps = ody.ceil( job_other_info('net_press_sheets'));
          if ( nps ) {
              var bsp = get_bindery_spoilage( nps, component );
              if ( bsp ) {
                  list.push( { label: 'Post Press Sheets', value: bsp } );
              }
              list.push( { label: 'Net Press Sheets', value: nps } );
              list.push( { label: '', value: '' } );
          }

        };

        var more_info = function() {
          var msg = row.More_Info;
          if ( msg ) {
              var ix = msg.indexOf(':');
              if ( ix > 0 ) {
                  list.push( { label: msg.substr(0,ix), value: msg.substring(ix+1).trim() } );
              } else {
                  list.push( { label: 'More Info', value: msg } );
              }
          }
        };

        switch ( type ) {
          case 'paper':
            show('Press_Description', 'Press');  // name, label

            if ( component.wf_substrate ) {
                show('wf_substrate','Substrate');
                show('wf_substrate_color','Color');
                show('wf_substrate_size', 'Size', 'size');
            } else {
                show('p1_stock_size', 'Stock Size', 'size');
                show('p1_description','Paper');
                show('p1_color','Paper Color');
            }

            var sup = parseInt( component[ sprintf('stock_up_%s',col) ] );
            if ( job.Other_Info ) {
                var press_sheets = parseInt( job_other_info('press_sheets') );
                var stock_sheets = press_sheets;
                if ( sup > 1 ) stock_sheets = ody.ceil( press_sheets / sup );
                if ( ! isNaN( stock_sheets ) ) {
                    list.push( { label: 'Stock Sheets Needed', value: stock_sheets } );
                }
            }

            show('p1_coated','Paper Coated','boolean');
            show('p1_stock_vendor','Stock Vendor');
            show('p1_caliper','Paper Caliper');

            break;
          case 'ink':
            add_default();
            show('ink1', 'Ink Side 1' );
            show('ink2', 'Ink Side 2' );
            more_info();

            break;
          case 'press':
            // get all information that the press operator might want
            // don't forget custom tasks --- and other resources
            show('Press_Description', 'Press');  // name, label
            show('p1_stock_size', 'Stock Size', 'size');
            show('press_sheet_size', 'Press Sheet Size', 'size');
            show('finished_size', 'Finished Size', 'size');
            show('stock_up', 'Press shts / stock sheet');
            show('press_up', '# up on press');
            list.push( { label: 'Press Sheets', value: job_other_info('press_sheets') } );
            let nps = ody.ceil( job_other_info('net_press_sheets') );
            var bsp = 0;
            if ( nps ) {
                bsp = get_bindery_spoilage( nps, component );
                if ( bsp ) {
                    list.push( { label: 'Post Press Sheets', value: bsp } );
                }
            }
            list.push( { label: 'Net Press Sheets', value: nps } );

            show('bleeds', 'Bleeds', 'bleeds');

            show('ink1', 'Ink Side 1' );
            show('ink2', 'Ink Side 2' );
            if ( typeof(data) !== 'undefined') {
              if ( data && data.Plates ) list.push( { label: 'Plates', value: data.Plates } );
            }

            var same = component[ sprintf('same_day_%s',col) ];
            var tumble = component[ sprintf('work_tumble_%s',col) ];
            var turn = component[ sprintf('work_turn_%s',col) ];
            if ( same ) {
                same = 'Same Day';
            } else {
                same = 'Different Day';
            }
            if ( turn ) list.push( { label: 'Work & Turn', value: same } );
            if ( tumble ) list.push( { label: 'Work & Tumble', value: same } );

            var pages = parseInt( component[ sprintf('pages_%s',col) ] );
            if ( ! isNaN(pages) && pages > 1 ) {
                // don't show signatures unless we have pages
                list.push( { label: 'Pages', value: pages } );
                var sigs = job_other_info('sigs');
                if ( sigs ) list.push( { label: 'Signatures', value: sigs } );
            }

            show('p1_description','Paper');
            show('p1_color','Paper Color');
            show('p1_coated','Paper Coated','boolean');
            show('p1_stock_vendor','Stock Vendor');
            show('p1_caliper','Paper Caliper');
            break;
          default:
            // no type specified
            add_default();
            add_resource_details( list );
            more_info();

            break;
        }

        add_jobticket_notes( list );

        // Set the style for every odd row in list
        let rowColor = get('selectedPrimaryColor');
        // lighten the color from .4 opacity to .2
        rowColor = rowColor.replace('.4', '.2');
        let rowStyle = 'background-color: ' + rowColor;
        for ( var i=0; i < list.length; i++ ) {
          if ( i % 2 === 1 ) {
            list[i].style = rowStyle;
          }
        }

        for ( let i=0; i < list.length; i++ ) {
          let l = list[i];
          l.label = stripExtraneousHtml(l.label);
        }

        detail.list = list;
        set( 'taskDetails', detail );
      }
    });
  }
};

const get_col_from_component = function( Quantity, component ) {
  Quantity = parseInt( Quantity );
  for ( let i=0; i < 3; i++ ) {
      let q = parseInt( component[ sprintf('quantities_%s', i) ] );
      if ( q === Quantity ) return i;
  }
  return 0;
};

const get_bindery_spoilage = function( nps, component ) {
    // nps is net press sheets
    // actually returns the sheets required off press to leave enough
    // for bindery spoilage
    let bsp = 0;
    var col = get_col_from_component( get('job'), component );
    let s = component[ sprintf('press1_bindery_spoilage_%s', col ) ];
    if ( s ) {
        let pct = false;
        if ( typeof(s) === 'string' && s.indexOf('%') > 0 ) pct = true;
        s = parseFloat( s );
        if ( isNaN(s) ) s = 0;
        if ( s ) {
            if ( pct ) s = ody.ceil( nps * s / 100 );
            bsp = nps + s;
        }
    }
    return bsp;
};

const stripExtraneousHtml = function( label ) {
  // In cutting we added an anchor tag to estimate entry.  That tag is showing up here where
  // we don't want it.  This function strips out the anchor tag and &nbsp; entries
  if (label) {
    label = label.replace(/&nbsp;/g,'');
    let ix1 = label.indexOf('<a');
    let ix2 = label.indexOf('</a');
    if ( ix1 > 0 && ix2 > ix1 ) {
      label = label.substr(0,ix1);
    }
  }
  return label;
};

const diffDays = function(d1, d2) {
// Calculate the difference of two dates in total days
  var ndays;
  let tv1 = d1.getTime();  // msec since 1970
  let tv2 = d2.getTime();
  ndays = (tv2 - tv1) / 1000 / 86400;
  ndays = Math.round(ndays - 0.5);
  ndays = Math.abs(ndays);
  return ndays;
}

const diffDays = function(d1, d2) {
// Calculate the difference of two dates in total days
  var ndays;
  let tv1 = d1.getTime();  // msec since 1970
  let tv2 = d2.getTime();
  ndays = (tv2 - tv1) / 1000 / 86400;
  ndays = Math.round(ndays - 0.5);
  ndays = Math.abs(ndays);
  return ndays;
}

const diffDays = function(d1, d2) {
// Calculate the difference of two dates in total days
  var ndays;
  let tv1 = d1.getTime();  // msec since 1970
  let tv2 = d2.getTime();
  ndays = (tv2 - tv1) / 1000 / 86400;
  ndays = Math.round(ndays - 0.5);
  ndays = Math.abs(ndays);
  return ndays;
}



function getManualMarketingTaskHistory(queryString, callback) {
  let data = [];
  let taskHistory = ""
  data.push({qName: 'queryResults', Query: queryString } );
  Meteor.call('forceFromAPI', 'multi', data, Session.get('vKey'), function (err, results) {
     if ( err ) {
       console.log('Error userstasks.js getManualMarketingTaskHistory() err=%s',err);
       console.log(data);
     }
     else {
       let recs = results.queryResults;
       let rec = recs[0];
       if ( rec ) {
         taskHistory = JSON.parse( rec.History );
         callback( taskHistory );
       }
     }
  });
};

function showMarketingProgressBar() {
  let processedList = get('processedList');
  let numProcessed = 0;
  if(processedList){
    numProcessed = processedList.length;
    // console.log("Number of contacts processed:", numProcessed);
  }
  let numOfContacts = get('numOfContacts');
  // console.log("Number of contacts:", numOfContacts);
  let strUpdatePerc = '';
  if (numProcessed === 0) {
    strUpdatePerc = '0%'
  } else {
    let percComp = (numProcessed / numOfContacts) * 100;
    percComp = Math.round(percComp);
    set('manualTaskCompPerc', percComp);
    strUpdatePerc = percComp.toString();
    strUpdatePerc += "%";
  }
  // console.log("strUpdatePerc", strUpdatePerc);
  let taskPercUpdate = document.getElementById('taskProgBarPerc').style.width = strUpdatePerc;
  let taskPercTxtUpdate = document.getElementById('taskBarPercText').innerHTML = strUpdatePerc;

};

function updateMarketingProgressBar(Running_ID, Action_ID) {
  // Update the Progress Bar and Percentage
  // console.log("Running_ID:", Running_ID);
  let processedList = get('processedList');
  let totalNumTasks = get('totalNumTasks');
  let numProcessed = 0;
  if(processedList){
    numProcessed = processedList.length;
    // console.log("Number of contacts processed:", numProcessed);
  }
  let numOfContacts = get('numOfContacts');
  // console.log("Number of contacts:", numOfContacts);
  let strUpdatePerc = '';
  if (numProcessed === 0) {
    strUpdatePerc = '0%'
  } else {
    let percComp = (numProcessed / numOfContacts) * 100;
    percComp = Math.round(percComp);
    set('manualTaskCompPerc', percComp);
    strUpdatePerc = percComp.toString();
    strUpdatePerc += "%";

    // update "Assigned Task Completed" progress bar
    // let manualTaskCompPerc = get('manualTaskCompPerc');
    taskPercTotal = get('taskPercTotal');
    let updateRate = (1 / numOfContacts) * 100;
    updateRate = Math.round(updateRate);
    // console.log('Update rate and taskPercTotal:', updateRate, taskPercTotal);
    if(percComp < (100 + updateRate)){
      // console.log("Still incrementing", percComp);
      taskPercTotal = taskPercTotal + updateRate;
      // console.log('newTaskPercTotal', taskPercTotal);
      set('taskPercTotal', taskPercTotal);

      // Update the Assigned Tasks Completed bar
      updateAssignedTasksCompleted();

    }

  }
  // console.log("strUpdatePerc", strUpdatePerc);
  let taskPercUpdate = document.getElementById('taskProgBarPerc').style.width = strUpdatePerc;
  let taskPercTxtUpdate = document.getElementById('taskBarPercText').innerHTML = strUpdatePerc;

  // The manual marketing task % just hit 100:
  if(strUpdatePerc === "100%"){
    manualMarketingTaskComplete();

    let manualTaskCompPerc = get('manualTaskCompPerc');
    // console.log("manualTaskCompPerc", manualTaskCompPerc);
    taskPercTotal += (100 - manualTaskCompPerc); // remaining balance
    set('taskPercTotal', taskPercTotal);

    // Update the Assigned Tasks Completed bar
    updateAssignedTasksCompleted();

    // Update Total Tasks completed this week
    let taskCompletedThisWeek = get('taskCompletedThisWeek');
    taskCompletedThisWeek++;
    set('taskCompletedThisWeek', taskCompletedThisWeek);
  }

};

function manualMarketingTaskComplete() {
  // All contacts have been processed. The manual marketing task is complete.
  // console.log('This manual marketing task is COMPLETE!!')
  set('manualMarketingTaskComplete', true);

  /*
    When a manual marketing task is complete, all of the following items need to be
     updated in the database:
     1. mc_running.History: There is a JSON object where Action_IDs are the keys. For the
       current Action_ID, add these two key-value pairs:
       "date_completed":"2018-07-12 11:26:08","completed_by":635965
       completed_by is the current user performing the actions.
     2. mc_running.Action_ID_In_Progress: Change this from the current Running_ID (i.e. 92) to 0.
     3. mc_running.Last_Action_ID: Change this from the previous Running_Id (i.e. 128) to the current Running_ID.
     4. mc_running.Actions_Completed: Increment this value.
     5. mc_running.Wake_Time: Update the Wake_Time using ody.get_wake_time( get('action') ); This is
        set to tell the next action when to start.
  */

  // Update the mc_running row in the database
  // Get the current row
  let Running_ID = get('Running_ID');
  let Action_ID = get('Action_ID');
  let queryString = "SELECT * from mc_running WHERE Running_ID = " + Running_ID + ";";
  SQLqueryForce(queryString, function(row) {
      // console.log('row contains:', row);
      currentAction_ID_In_Progress = row[0].Action_ID_In_Progress;
      currentActions_Completed = row[0].Actions_Completed;
      taskHistory = JSON.parse(row[0].History);
      // console.log('History', taskHistory);

      // console.log('Action_ID', Action_ID);
      let thisTaskHistory = taskHistory[Action_ID];
      // console.log('thisTaskHistory is set to', thisTaskHistory);
      thisTaskHistory["date_completed"] = ody.today();
      thisTaskHistory["completed_by"] = ody.get_userid();
      // console.log('Uptdated thisTaskHistory', thisTaskHistory);
      taskHistory[Action_ID] = thisTaskHistory;
      taskHistory = JSON.stringify(taskHistory);
      // console.log('Uptdated History', taskHistory);

      // Get Wake_Time for database update
      let actionQuery = "SELECT * from mc_actions WHERE Action_ID = " + Action_ID + ";";
      SQLqueryForce(actionQuery, function(actionRow) {
        // console.log('actionRow', actionRow);

        let action = actionRow[0];
        if ( action && action.Specs ) {
            action.Specs = JSON.parse( action.Specs );
        } else {
            action = { Specs: {} };
        }
        // console.log('action', action);
        let Wake_Time = ody.get_wake_time( action );
        // console.log('Wake_Time:', Wake_Time);

        let update_mc_running = {
          Table: 'odyssey.mc_running',
          Fields: {
            History: taskHistory,
            Last_Action_ID: currentAction_ID_In_Progress,
            Action_ID_In_Progress: 0,
            Actions_Completed: parseInt(currentActions_Completed) + 1,
            Wake_Time: Wake_Time
          },
          Conditions: { Running_ID: parseInt(Running_ID) }
        };
        // console.log("Fields:", update_mc_running);

        // This line is what updates the database
        ody.api_call('updateSingleRow', update_mc_running);

      });
  });
}

// Takes in any SQL query 'queryString' and returns the results to the caller
function SQLqueryForce(queryString, callback) {
  let data = [];
  data.push({qName: 'queryResults', Query: queryString } );
  Meteor.call('forceFromAPI', 'multi', data, Session.get('vKey'), function (err, results) {
     if ( err ) {
         // report error
         console.log('Error: userstasks.js SQLqueryForce() %s',err);
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
