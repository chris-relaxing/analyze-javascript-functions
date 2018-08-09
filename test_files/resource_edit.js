var field_defs = [];
field_defs.push( {field: 'Intended_For', type: 'radio',
            // v=value, l=label to show on screen
            options: [ {v:'sites', l: 'Websites'}, {v:'estimators', l:'Estimators'}, {v:'both', l:'Both'}] });
field_defs.push( {field: '', type: '' } );
field_defs.push( {field: '', type: '' } );
field_defs.push( {field: '', type: '' } );
field_defs.push( {field: '', type: '' } );
field_defs.push( {field: '', type: '' } );
field_defs.push( {field: '', type: '' } );
field_defs.push( {field: '', type: '' } );

var pre = 'resource_types_';  // We have what we need here from resource_types
var get = function(n) { return Session.get(pre + n); };
var set = function(n, v) { Session.set(pre + n, v); };
var setd = function(n, v) { Session.setDefault(pre + n, v); };

Template.resource_edit.rendered = function() {
    if(localStorage.getItem('pinToClose')=='true' && localStorage.getItem('pinToMargin')=='false'){
            $('#page').css('margin-left', '235px')
    }
    if ($('#Description').length ) $('#Description').focus();
    if ($('#Press_ID').length ) $('#Press_ID').focus();
};

var goto_task = function() {
    if ( !get('goto_task') ) return; // not going to a task
    var task_num = get('goto_task');
    if ( get('groups_active') ) {
        var cur = get('group_current');
        // set group task mode to true for this group
        var gtm = get('group_task_mode');
        if (typeof(gtm) === 'undefined') gtm = {};
        gtm[cur] = true;
        set('group_task_mode', gtm);
        set('task_index', task_num);
        Meteor.setTimeout( function() {
                $('#add_task_trigger').click();
            }, 200);
    } else {
        // no groups
        set('mode',3);  // set to task mode
        set('task_index', task_num);
        Meteor.setTimeout( function() {
                $('#add_task_trigger').click();
            }, 200);
    }

    set('goto_task',''); // reset for later

};

var clear_tasks = function(specs) {
    // We are cloning and the tasks will have the Resource_ID from the original
    // resource, which will be no good.
    // Change Resource_ID to NaN - which will be dealt with later.
    var tasks;
    var current = get('current');
    var current_plus = current + '_';
    var cur_length = current.split('_').length;

    var clear_one_task = function(task) {
        var key2;
        task.code = 'NaN_' + task.code.split('_')[1];
        for (var key in task) {
            if (task.hasOwnProperty(key)) {
                if ( key !== 'code' && key !== 'description' ) {
                    if ( key.substr(0, current.length+1) === current_plus ) {
                        var v = task[key];
                        key2 = key.split('_');
                        key2[ cur_length ] = 'NaN';
                        key2 = key2.join('_');
                        task[key] = undefined;
                        task[key2] = v;
                    }
                } else if ( key === 'code' ) {
                    var v = task[key].split('_');
                    v[0] = 'NaN';
                    v = v.join('_');
                    task[key] = v;
                }
            }
        }
    };

    if ( jQuery.isArray(specs) ) {
        for (var i=0; i < specs.length; i++) {
            var spec = specs[i];
            tasks = spec.Tasks;
            if ( typeof(tasks) !== 'undefined' ) {
                for (var i2=0; i2 < tasks.length; i2++) {
                    var task = tasks[i2];
                    clear_one_task(task);
                }
            }
        }
    } else {
        tasks = specs.Tasks;
        if ( typeof(tasks) !== 'undefined' ) {
            for (var i2=0; i2 < tasks.length; i2++) {
                var task = tasks[i2];
                clear_one_task(task);
            }
        }
    }
};

Template.resource_edit.created = function() {
    if ( !get('first_edit') ) {
        return;  // we refreshed - leave session variables alone
    }
    set('has_changed', false);
    set('no_cancel', false);
    set('changes_saved', false);
    set('warning_message','');
    set('first_edit', false);
    set('group_task_mode',{});
    set('mode', 0);  // 0=normal, show resource (or config), 1=calc sample, 2=custom calc, 3=tasks
    set('edit_alternate_sheets','');
    set('pressRunPopupActive',false);

    var resources = get('resources');
    var id = get('id');
    var data = {};

    setd('edit', data);
    setd('errors',[]);
    setd('original_resource', {});
    setd('tags',[]); // existing global tags

    set('run_code_after', false);
    set('run_last', false);

    if (resources && id) {
        for (var i=0; i < resources.length; i++) {
            var resource = resources[i];
            if ( parseInt(resource.Resource_ID) === id ) {
                if (special_dept_handling()) {
                    init_dept( resource );
                }
                data = resource.Specs;

                if ( Array.isArray( data ) && data.length > 0 ) {
                    if ( data[0].Run_Code_After ) set('run_code_after', true);
                    if ( data[0].Run_Last ) set('run_last', true);
                } else {
                    if ( data.Run_Code_After ) set('run_code_after', true);
                    if ( data.Run_Last ) set('run_last', true);
                }

                ody.clean_tasks(data, parseInt(resource.Resource_ID) );
                adjust_digital_press_data( data );
                set('edit', data);
                set('original_resource', resource); // so we can see what changed
                if( ody.isNULL( resource.Dept_ID ) && get('departments').length > 0 ) {
                  set( 'has_changed', true );
                  set( 'no_cancel', true );
                }
                break;
            }
        }
    }

    var fields = [];
    var f = 'define_' + get('current');
    // for example, f = 'define_paper_sheets' is one example
    try {
        fields = ody[f]();
        set('fields', fields);
    } catch(err) {
        console.log('Error: "' + f + '" not defined in ody.py');
        set('fields', [] );
    }

    var hamburger = '';
    if (id === 0) {
        // see if we have description from hamburger
        var data = get('default_data');
        if (data && data.Name) {
            // loading from hamburger
            hamburger = data.Name;
            set('default_data', '');
        }
    }

    var clone = false;
    if ( get('clone') ) {
        // we are cloning.
        var clone = true;
        set('clone', false);
        data = get('edit');
        if ( Array.isArray( data ) ) {
            data[0].Press_ID += ' (copy)';
        } else {
            data.Description += ' (copy)';
        }
        clear_tasks(data);
        set('edit', data);

        set('original_resource', { Type_ID: data.Type_ID });
        set('id', 0);
    }

    var groups_active = false;
    var group_indexes = [];
    for (var i=0; i < fields.length; i++) {
        var field = fields[i];
        if ( field.type === 'group') {
            groups_active = true;
            group_indexes.push( i );
        }
    }
    set('groups_active', groups_active);
    set('group_indexes', group_indexes);
    set('group_current', 0);  // 0 is press identifier - default

    if ( get('goto_config') ) {
        // init to a different group_current
        set('group_current', parseInt( get('goto_config') ) + 1);
        set('goto_config',''); // reset for later
    }

    goto_task(); // go straight to a task, if told to do so

    if ( groups_active && get('id') === 0 && !clone ) {
        // we are starting from scratch. specs are a list in this case
        var o = {};
        set_defaults( o );
        if ( hamburger ) o.Press_ID = hamburger;
        set('edit',[ o ]);
    }

    if ( !groups_active && get('id') === 0 && !clone ) {

        var edit = {};
        set_defaults( edit );
        if ( hamburger ) edit.Description = hamburger;
        set('edit', edit);
    }

    var edit = get_edit(0);
    if ( typeof(edit) === 'undefined') edit = {};
    var cq = edit.Calc_Qty;
    if ( typeof(cq) !== 'undefined') {
        set('Calc_Qty', cq);
    } else {
        set('Calc_Qty', {});
    }
    ody.set_title('Resource Configuration');
    var navlinks = [];
    var url = 'resources';
	navlinks.push( { NavLink: '<a class="fa fa-arrow-left" href="' + url + '">Back to Resource List</a>' } );
    ody.set_page( '', navlinks );

};

var adjust_digital_press_data = function( data ) {
    // on digital presses, at some point (April 2017), we moved some data from the main press area to
    // the configuration area.  When loading an older format, we need to move some fields
    // from the main press area to each configuration.  "data" is an array, the first
    // element is main, the rest are configurations
    // actually - this applies to offset presses also, that were changed 7/19/17 adding Gripper, Color_Bar and Side_Guides

    if ( ! Array.isArray(data) || data.length < 2 ) return; // no configurations, nothing to change

    var list = [];
    if ( data[1].Click_Sizes ) {
        // it's a digital press
        list = ['Min_Size','Max_Size','Digital_Copier','Max_Image_Size'];
        if ( data[1].Min_Size ) return; // data already copied, nothing to do
    }
    if ( data[1].Lbs_to_Fill_Fountain ) {
        // it's an offset press
        list = ['Gripper','Color_Bar','Side_Guides'];
        if ( data[1].Gripper ) return; // data already copied, nothing to do
    }

    if ( list.length === 0 ) {
        return; // not a digital or offset press
    }

    // list of fields to copy

    var main = data[0];
    for ( var i=1; i < data.length; i++ ) {
        var d = data[i];
        for ( var i2=0; i2 < list.length; i2++ ) {
            var n = list[i2];
            if ( main[n] ) d[n] = main[n];
        }
        if ( d.Sheets_Per_Hr ) {
            // update sheets per hour to minutes per page
            d.Pages_Per_Minute = ody.ceil( d.Sheets_Per_Hr / 60 );
        }
    }
    // now clear these values out of main
    for ( var i2=0; i2 < list.length; i2++ ) {
        var n = list[i2];
        delete main[n];
    }

};

var set_defaults = function( o ) {
    var fields = get('fields');
    for ( var i=0; i < fields.length; i++) {
        var field = fields[i];
        if ( typeof(field.default) !== 'undefined' ) o[ field.name ] = field.default;
    }
};

var config_active = function() {
    // return true if we are currently editing a press configuration AND there
    // are at least 2 configurations defined
    if ( get('groups_active') && get('group_current') > 0 ) {
        // we are editing a configuration
        return ( get('edit').length > 2 )
    }
    return false;
};

var form_field_html = function() {
    // prepare html for label/input pairs to be added to a form
    var hide_later = [];
    var fields = get('fields');
    var rec = get_edit();

    var get_ok_to_show = function( field ) {
        ok = true; // default

        if ( get('groups_active') ) {
            // groups are active, see if the current field should be displayed
            var indexes = get('group_indexes');
            var cur = get('group_current');
            if ( cur === 0 && i > indexes[1] ) ok = false;
            if ( cur > 0 && i < indexes[1] ) ok = false;
            if ( field.type === 'group' ) ok = false;
        }
        return ok;
    }

    if ( typeof(rec) === 'undefined' ) {
        // group_current must be set to a non-valid value
        // probably has a custom calc tab open
        return fields;
    }
    for (var i=0; i < fields.length; i++) {
        var field = fields[i];
        field.html = 'not defined';
        var units_class = field.unit_position || "";
        if (!field.label) field.label = field.name.replace(/_/g, ' ');
        var value = rec[field.name];
        if ( typeof(value) === 'undefined') {
            value = '';
        }
        if ( field.type === 'hr' ) {
            field.html = '<hr style="border: 0; height: 1px; background:#d1d2d4; margin-left: -120px;margin-top:5px; margin-bottom:0px; width:80%;"/>';
            field.ok_to_show = true;
            continue;
        }
        if ( field.special ) {
            var f = ody[field.special];
            if (f) {
                field.html = f(field.name, rec, field);
            } else {
                console.log('special: problem. ody.' + field.special + ' is not defined');
                throw 'special function not found';
            }
            field.ok_to_show = get_ok_to_show( field );
            continue;
        }
        if (field.type === 'str' || field.type === 'int') {
            var cls = "units_" + units_class;
            field.html = '';
            if ( field.react ) cls = " input-react";
            if ( field.type === 'int' ) {
                cls += ' col-sm-4';
            } else {
                cls += ' col-sm-12';
            }
            if ( units_class === "before") field.html += '<div class="units"><span class="prepend-units">' + field.units + '</span></div>';
            field.html += sprintf('<input type="text" class="edit-input%s" id="%s" value="%s"', cls, field.name, value);
            if (field.placeholder) field.html += sprintf(' placeholder="%s"', field.placeholder);
            field.html += '>';
            if ( units_class === "after") field.html += '<div class="units"><span class="append-units">' + field.units + '</span></div>';
            if (field.type === 'int') {
                field.html += '<a class="fa fa-minus-circle decrement" href="#"></a>';
                field.html += '<a class="fa fa-plus-circle increment" href="#"></a>';
            }
        }
        if (field.type === 'float') {
            field.html = '';
            var cls = "units_" + units_class;
            if ( units_class === "before") field.html += '<div class="units"><span class="prepend-units">' + field.units + '</span></div>';
            field.html += '<input type="text" class="edit-input ' + cls + ' col-sm-4" id="' + field.name + '" value="' + value + '" >';
            if ( units_class === "after") field.html += '<div class="units"><span class="append-units">' + field.units + '</span></div>';
        }
        if (field.type === 'size') {
            if ( typeof(value) === 'string') {
                // if saved earlier (before we stored width and length separately,
                // value could be a string like ( 8.5 x 11 )
                value = value.toLowerCase().split('x');
                if ( value.length < 2) value.push('');
            }
            field.html = '<input type="text" class="edit-input special-x col-sm-4" id="' + field.name + '_0" value="' + value[0] + '" style="">';
            field.html += '<span class="dimension-x fa fa-times col-sm-1"></span>';
            field.html += '<input type="text" class="edit-input col-sm-4" id="' + field.name + '_1" value="' + value[1] + '" style="">';
        }
        if (field.type === 'checkbox_list') {
            // list of checkboxes
            field.html = '';
            if (field.list) {
                for (var l=0; l < field.list.length; l++) {
                    field.html += '<div class="checkbox-page-element">';
                    var cls = [];
                    if ( field.react ) cls.push( "input-react" );
                    cls.push('h-checkbox-list');
                    var o = field.list[l];
                    var id = field.name + '_' + o.value;
                    field.html += '<input type="checkbox" id="' + id + '"';
                    if ( cls.length > 0) {
                        field.html += ' class="' + cls.join(' ') + '"';
                    }
                    if ( typeof(value) === 'number') value = [];  // garbage value - clear it out
                    if ( value && value.indexOf(o.value) >= 0) field.html += ' checked';
                    field.html += '>';
                    field.html += '<label class="checkbox-label" for="' + id +'">' + o.label + '</label>';
                    field.html += '</div>';
                }
            }
        }
        if (field.type === 'group_name'){
            field.ok_to_show = get_ok_to_show( field );
            continue;
        }
        if (field.type === 'list') {
            if (field.list) {
                // a list function is defined, just use that
                field.html = '';
                field.html += '<label class="select">';
                field.html += '<select id="' + field.name + '" class="change_select">';
                for (var l=0; l < field.list.length; l++) {
                    var o = field.list[l];
                    var sel = '';
                    if (o.value === value) sel = ' selected';
                    field.html += '<option value="' + o.value + '"';
                    if (sel) field.html += sel;
                    field.html += '>' + o.label + '</option>';
                }
                field.html += '</select>';
                field.html += '</label>';
            }
        }
        if (field.type === 'text_list') {
            // list of text input boxes
            field.html = '';
            if (typeof(value) === 'undefined') value = [];
            for (var t=0; t < value.length; t++) {
                var v = value[t];
                field.html += '<input id="' + field.name + '_' + t + '"';
                field.html += ' class="text-list-change edit-input col-sm-4"';
                field.html += ' value="' + v + '">';
            }
            field.html += '<input class="text-list edit-input col-sm-4" id="' + field.name + '"';
            field.html += ' placeholder="add here">';
        }
        if (field.type === 'boolean') {
            // a list function is defined, just use that
            field.html = ody.boolean_html( field.name , value, i );
        }
        if (field.type === 'text') {
            // textarea
            field.html = '';
            var style = field.style;
            field.html += '<textarea id="' + field.name + '" class="text_area">';
            field.html += value;
            field.html += '</textarea>';
        }
        if (field.style && field.html.indexOf('<input ') >= 0) {
            field.html = field.html.substr(0, field.html.length-1) + ' style="' + field.style + '">';
        }

        field.ok_to_show = get_ok_to_show( field );

        if ( field.ok_to_show && field.hide ) {
            // hide on initial load
            var id = '#row_' + field.name;
            hide_later.push(id);
        }

    }

    if ( hide_later.length > 0 ) {
        Meteor.setTimeout(function() {
            for (var i=0; i < hide_later.length; i++) {
                id = hide_later[i];
                var id2 = id.replace('_List','_Type');
                id2 = id2.replace('row_','');
                if (!$(id2).length || $(id2).val() !== 'list') {
                    // this is specifically for List of Values (custom resource)
                    // don't hide if Type Of Value is 'list'
                    $( id ).hide();
                }
            }
        }, 200);
    }
    var valid_fields = get_valid_fields(fields);
    return valid_fields;
};

var get_valid_fields = function(fields){
    var valid_fields = [];
    for(var i=0; i<fields.length; i++) {
        if (fields[i].ok_to_show === true) {
            valid_fields.push(fields[i]);
        }
    }
    return valid_fields;
}

var get_tasks = function() {
    var edit = get_edit();
    var tasks = edit.Tasks;
    if ( typeof(tasks) === 'undefined' ) tasks = [];
    return tasks;
};

var group_task_active = function() {
    var gtm = get('group_task_mode');
    if (typeof(gtm) === 'undefined') gtm = {};
    var cur = get('group_current');
    if ( gtm[cur] ) {
        return true;
    }
    return false;
};

var get_resource_name = function() {
  if ( get('edit') ) {
    var resource = get('edit')[0];
    if(typeof resource === 'undefined'){
        var description = get('edit')['Description'];
        if(typeof description === 'undefined') {
            return 'Unnamed Resource';
        } else {
            return description;
        }
    } else {
        if (typeof resource['Press_ID'] === 'string' && resource['Press_ID'] !== "") {
            return resource['Press_ID'];
        } else if (typeof resource['Description'] === 'string' && resource['Description'] !== "") {
            return resource['Description'];
        } else {
            return "Unnamed Resource";
        }
    }
  } else {
    // perhaps not loaded yet
    return '';
  }
};

var add_configurations_to_nav = function(nav_panel) {
    var edit_list = get('edit');
    var active = get('group_current');
    var configurations = [];
    if(Array.isArray(edit_list)){
        // resource is a press, with configurations
        for (var i = 1; i < edit_list.length; i++) {
            var text = edit_list[i]['Description'];
            var icon_name = "fa-gears";
            var selected = false;
            var id = 'configuration_' + i;
            if(active === i){
                var selected = true;
            }
            var configuration = new NavOption(text, 'fa-gears', id, 'configuration change_config', selected);
            add_tasks_to_nav_option(configuration, edit_list[i]['Tasks']);
            nav_panel.addNavOption(configuration);
        }
    } else {
        // resource does not have configurations
        add_tasks_to_nav_option(nav_panel.nav_options[0], edit_list['Tasks']);
    }
};

var add_tasks_to_nav_option = function(nav_option, tasks){
  // On the RESOURCE CONFIGURATION page, this function builds the list of tasks under the resource name
  // under the heading "Edit a Resource"
  if(tasks_enabled()) {
      if (typeof tasks !== 'undefined') {
          for (var i = 0; i < tasks.length; i++) {
              var text = tasks[i]['description'];
              if ( tasks[i].default_task ) {
                  text += ' *';
              }
              nav_option.add_subnav(new NavOption(text, '', nav_option.id + '_task_' + i, 'view_task'));
          }
      }
      nav_option.add_subnav(new NavOption('Add Task', 'fa-plus-circle', nav_option.id + '_add_task', 'add_task'));
  }
};

var add_calc_to_nav = function(nav_panel){
    if(!Boolean(ody.default_calc() === '' )){
        if ( get('current') !== 'press_wide_format' ) {
            // special case for wide format
            nav_panel.addNavOption(new NavOption('Calculation Test', 'fa-calculator', 'calculator_1', 'change_calc'));
        }
        nav_panel.addNavOption(new NavOption('Custom Calculator', 'fa-calculator', 'calculator_2', 'change_calc'));
    }
};

var split_tables_from_fields = function(fields){
    // return two arrays: one of tables, and one of fields
    var results = [];
    var fields_only = [];
    var tables_only = [];
    for( var i=0; i<fields.length; i++){
        if(fields[i].html.search('<table') >= 0){
            tables_only.push(fields[i]);
        } else {
            fields_only.push(fields[i]);
        }
    }
    results = [fields_only, tables_only];
    return results;
};

var tasks_enabled = function(){
    var o = {};
    o.code = get('current');
    o.Resource_ID = parseInt( get('original_resource').Resource_ID );
    o.specs = get_edit();
    var questions = ody.resource_questions( o );
    if (questions.length === 1 && questions[0].name === 'no_name' ) {
        // things like paper have no tasks
      return false;
    }
    if ( o.code.indexOf('press_') === 0 ) {
      // Presses don't have tasks either
      return false;
    }
    return true;
};

Template.resource_edit.helpers({
        // modes:
        // 0 = resource
        // 1 = calculate
        // 2 = custom
        // 3 = task

        pressRunPopupActive: function() {
          console.log('jones653 pressRunPopupActive=%s',get('pressRunPopupActive'));
          return get('pressRunPopupActive');
        },
        edit_blades: function() {
            return ( get('current') === 'substrate' );
        },
        edit_alternate_sheets: function() {
            return get('edit_alternate_sheets');
        },
        wide_format: function() {
            return ( get('current') === 'press_wide_format' )
        },
        calculator_active: function() {
            // true if we are currently viewing one of the calculator tabs
            var c = get('mode');
            if ( typeof(c) === 'number' && c > 0 && c < 3) return true;
            return false;
        },
        global_table_active: function() {
            return get('global_table_active');
        },
        calculator_defined: function() {
            if ( ody.default_calc() === '' ) return false;
            return true;
        },
        link_class_resource: function() {
            if ( get('mode') !== 0 ) return 'res-left';
            return 'res-left-highlight';
        },
        link_task_class: function() {
            if ( get('mode') === 3 ) return 'res-left-highlight';
            return 'res-left';
        },
        link_class_calc: function() {
            if ( get('mode') !== 1 ) return 'res-left';
            return 'res-left-highlight';
        },
        link_class_custom: function() {
            if ( get('mode') !== 2 ) return 'res-left';
            return 'res-left-highlight';
        },
        resource: function() {
            return ( get('mode') === 0 );
        },
        calculate: function() {
            return ( get('mode') === 1 );
        },
        custom: function() {
            return ( get('mode') === 2 );
        },
        task_mode: function() {
            return ( get('mode') === 3 );
        },
        tasks_enabled: function() {
            var o = {};
            o.code = get('current');
            o.Resource_ID = parseInt( get('original_resource').Resource_ID );
            o.specs = get_edit();
            var questions = ody.resource_questions( o );
            if (questions.length === 1 && questions[0].name === 'no_name' ) {
                // things like paper have no tasks
                return false;
            }
            return true;
        },
        task_count: function() {
            var tasks = get_tasks();
            if (!tasks) return '(0)';
            return sprintf('(%s)', tasks.length);
        },
        tasks: function() {
            var tasks = get_tasks();
            return tasks;
        },
        warning_message: function() {
            var msg = get('warning_message');
            if ( msg ) {
                $( '#warning' ).show();
            } else {
                $( '#warning' ).hide();
            }
            return msg;
        },
        press_label: function() {
            var edit = get('edit');
            if ( typeof(edit[0]) === 'undefined') edit[0] = {};
            var label = edit[0].Press_ID;
            if ( !label ) label = 'Unnamed Press';
            return label;
        },
        no_group: function() {
            // returns true if there are no "group" types in fields
            return !get('groups_active');
        },
        left_title: function() {
            // show the dynamic title on the left side of the screen
            var edit = get_edit();
            var n = get('fields')[0].name;
            var v = edit[n];
            if (!v) v = 'Missing Description';
            return v;
        },
        config_active: function() {
            // returns true if we are currently editing a configuration
            return config_active();
        },
        left: function() {
            var v = $(window).width();
            if ( config_active() ) v -= 100;
            return (v - 220) + 'px;';
        },
        top: function() {
            var obj = $('#menu-bar');
            var y = $(obj).position().top + $(obj).height();
            return y.toString() + 'px;';
        },
        title: function() {
            var t = '';
            var c = get('current');
            if ( c === 'paper_sheets') t = 'Paper - Sheets';
            if ( c === 'paper_rolls') t = 'Paper - Rolls';
            if ( c === 'ink') t = 'Ink';
            if ( c === 'envelopes') t = 'Envelope';
            if ( c === 'press_digital') t = 'Press - Digital';
            if ( c === 'press_offset') t = 'Press - Offset - Sheet';
            if ( c === 'press_inkjet_web') t = 'Press - Inkjet - Web';
            if ( c === 'press_inkjet_sheet') t = 'Press - Inkjet - Sheet';
            if ( c === 'press_offset_web') t = 'Press - Offset - Web';
            if ( c === 'press_wide_format') t = 'Press - Wide Format';
            if ( c === 'substrate') t = 'Wide Format - Substrate';
            if ( c === 'press_envelope') t = 'Press - Envelope';
            if ( c === 'general') t = 'General Purpose Resource';
            if ( c === 'proof') t = 'Proof';
            if ( c === 'cut') t = 'Cut';
            if ( c === 'drill') t = 'Drill';
            if ( c === 'fold') t = 'Fold';
            if ( c === 'pack') t = 'Pack';
            if ( c === 'hours') t = 'Hourly Operation';
            if ( c === 'bind') t = 'Bind';
            if ( c === 'custom') t = 'Custom';
            if (!t) {
                t = 'Set Title in Helper (' + c + ')';
            }
            if ( get('id') > 0) {
                t = 'Edit: ' + t;
            } else {
                t = 'Add New: ' + t;
            }
            return t;
        },
        form_fields: function() {
            var fields = form_field_html();
            var split = split_tables_from_fields(fields);
            fields = split[0];
            var tables = [];
            var columns = [];
            var contents = {};
            if(fields.length >= 10) {
                columns[0] = fields.splice(0, Math.ceil(fields.length / 2));
                columns[1] = fields;
            } else {
                columns[0] = fields;
            }
            contents.columns = columns;

            tables[0] = split[1];
            if(tables[0].length > 0){
                contents.tables = tables;
            }

            return [contents];
        },
        link: function() {
            return '/resources';
        },
        press_id_class: function() {
            if ( get('group_current') === 0 ) return 'res-left-highlight';
            return 'res-left';
        },
        group_task_active: function() {
            var is_active = group_task_active();
            return is_active;
        },
        config_list: function() {
            // return a list of configurations for the current press
            var o;
            var cur = get('group_current');
            var edit_list = get('edit');
            var op = [];
            // i==0 is press identifier, > 0 are configurations
            for (var i=1; i < edit_list.length; i++) {
                o = {};
                var edit = edit_list[i];
                o.cls = 'res-left';
                if (i === cur) {
                    o.cls += '-highlight';
                    o.style = "height: auto;";
                }
                var desc = edit.Description;
                if ( !desc ) desc = 'No Description';

                var tasks = edit.Tasks;
                if (typeof(tasks) === 'undefined') tasks = [];
                o.label = desc;
                o.index = i;
                o.group_tasks = tasks;
                o.group_task_count = sprintf('(%s)',tasks.length);
                var gtm = get('group_task_mode');
                if (typeof(gtm) === 'undefined') gtm = {};
                o.group_task_mode = gtm[i];
                op.push( o );
            }
            return op;
        },
        sidebar: function(){
            var active = get('group_current');
            if(active === 0){
                var selected = true;
            } else {
                var selected = false;
            }
            var is_first_edit = get('id');
            var panel_text = is_first_edit > 0 ? 'Edit a Resource' : 'Create a Resource';
            var nav_panel = new NavPanel(panel_text);
            var resource = new NavOption(get_resource_name(), "fa-wrench", "resource_0", 'change_config', selected);
            nav_panel.addNavOption(resource);
            if(Array.isArray(get('edit'))){
                nav_panel.nav_options[0].add_subnav(new NavOption('Add Configuration', 'fa-plus-circle', 'add_config'));
            }
            add_configurations_to_nav(nav_panel);
            add_calc_to_nav(nav_panel);
            return nav_panel;
        },
        mode: function(){
            return get('mode');
        },
        groups_active: function(){
            return get('groups_active');
        },
        group_current: function(){
            return get('group_current');
        },
        log: function(){
            console.log(this);
        },
        has_changes: function(){
            return get('has_changed');
        },
        can_cancel: function(){
            let no_cancel = get('no_cancel');
            return ! no_cancel;
        },
        changes_saved: function() {
            return get('changes_saved');
        }
});

var clear_errors = function() {
    var errors = get('errors');
    for (var i=0; i < errors.length; i++) {
        var id = errors[i].id;
        $('#' + id).css('background-color', '');
        $('#' + id).css('border', '');
    }
    set('errors',[]);
};

var get_type = function( ) {
    // get current resource type given code
    var types = get('resourceTypes');
    var code = get('current');
    for (var i=0; i < types.length; i++) {
        var t = types[i];
        if (t.Code === code) {
            return t;
        }
    }
    return {}; // type not found
};
var get_text_list_values = function( id ) {
    var key;
    var values = [];
    var i = 0;
    var removed = -1;
    while (true) {
        key = '#' + id + '_' + i;
        if ( ! $(key).length ) break;
        var value = $(key).val();
        if (value) {
            values.push(value);
        } else {
            removed = values.length;
        }
        i += 1;
    }
    if ( removed >= 0 ) {
        // something was removed from the list
        // we need to adjust any affected tables
        adjust_other_fields( id, removed );
    }
    return values;
};

var adjust_other_fields = function( id, removed ) {
    // we moved something from a field that may have
    // affected other fields on the screen, adjust the
    // other fields.
    var colors, sz, cix, color, col, key, key2, v, list;

    var sw = sprintf('%s_%s', get('current'), id );

    switch ( sw ) {
    case 'envelopes_Colors':
        // Carton Price ( "c_<color>
        for ( cix=removed; cix < 100; cix++ ) {
            key = sprintf('#c_%s',cix);
            if ( ! $(key).length ) break;
            key2 = sprintf('#c_%s',cix+1);
            if ( $(key2).length ) {
                $(key).val( $(key2).val() );
            } else {
                $(key).val( '' );
            }
        }
        // Skid Price ( "s_<color>
        for ( cix=removed; cix < 100; cix++ ) {
            key = sprintf('#s_%s',cix);
            if ( ! $(key).length ) break;
            key2 = sprintf('#s_%s',cix+1);
            if ( $(key2).length ) {
                $(key).val( $(key2).val() );
            } else {
                $(key).val( '' );
            }
        }
        break;
    case 'paper_rolls_Widths':
        // Price ( "p_<width>_<feet / price>
        list = ['feet','price'];
        for ( sz=removed; sz < 100; sz++ ) {
            key = sprintf('#s_%s_%s',sz,'feet');
            if ( ! $(key).length ) break;
            for ( cix=0; cix < 100; cix++ ) {
                key = sprintf('#s_%s_%s',sz, list[cix] );
                key2 = sprintf('#s_%s_%s',sz+1, list[cix]);
                if ( ! $(key).length ) break;
                if ( $(key2).length ) {
                    $(key).val( $(key2).val() );
                } else {
                    $(key).val( '' );
                }
            }
        }
        // Not Available ( s_<size>_<color>
        for ( sz=removed; sz < 100; sz++ ) {
            key = sprintf('#s_%s_%s',sz,0);
            if ( ! $(key).length ) break;
            for ( cix=0; cix < 100; cix++ ) {
                key = sprintf('#s_%s_%s',sz,cix);
                key2 = sprintf('#s_%s_%s',sz+1,cix);
                if ( ! $(key).length ) break;
                if ( $(key2).length ) {
                    v = $(key2).is(':checked');
                    if ( v ) {
                        $(key).prop('checked','checked');
                    } else {
                        $(key).prop('checked','');
                    }
                } else {
                    $(key).val( '' );
                }
            }
        }
        break;
    case 'paper_rolls_Colors':
        // Not Available ( s_<size>_<color>
        for ( sz=0; sz < 100; sz++ ) {
            key = sprintf('#s_%s_%s',sz,0);
            if ( ! $(key).length ) break;
            for ( cix=removed; cix < 100; cix++ ) {
                key = sprintf('#s_%s_%s',sz,cix);
                key2 = sprintf('#s_%s_%s',sz,cix+1);
                if ( ! $(key).length ) break;
                if ( $(key2).length ) {
                    v = $(key2).is(':checked');
                    if ( v ) {
                        $(key).prop('checked','checked');
                    } else {
                        $(key).prop('checked','');
                    }
                } else {
                    $(key).val( '' );
                }
            }
        }
        break;
    case 'paper_sheets_Sizes':
        // Price Table ( "p_<size>_<color>
        for ( sz=removed; sz < 100; sz++ ) {
            key = sprintf('#p_%s_%s',sz,0);
            if ( ! $(key).length ) break;
            for ( cix=0; cix < 100; cix++ ) {
                key = sprintf('#p_%s_%s',sz,cix);
                key2 = sprintf('#p_%s_%s',sz+1,cix);
                if ( ! $(key).length ) break;
                if ( $(key2).length ) {
                    $(key).val( $(key2).val() );
                } else {
                    $(key).val( '' );
                }
            }
        }
        // Not Available ( s_<size>_<color>
        for ( sz=removed; sz < 100; sz++ ) {
            key = sprintf('#s_%s_%s',sz,0);
            if ( ! $(key).length ) break;
            for ( cix=0; cix < 100; cix++ ) {
                key = sprintf('#s_%s_%s',sz,cix);
                key2 = sprintf('#s_%s_%s',sz+1,cix);
                if ( ! $(key).length ) break;
                if ( $(key2).length ) {
                    v = $(key2).is(':checked');
                    if ( v ) {
                        $(key).prop('checked','checked');
                    } else {
                        $(key).prop('checked','');
                    }
                } else {
                    $(key).val( '' );
                }
            }
        }
        break;
    case 'paper_sheets_Colors':
        // Price Table ( "p_<size>_<color>
        for ( cix=removed; cix < 100; cix++ ) {
            key = sprintf('#p_%s_%s',0,cix);
            if ( ! $(key).length ) break;
            for ( sz=0; sz < 100; sz++ ) {
                key = sprintf('#p_%s_%s',sz,cix);
                key2 = sprintf('#p_%s_%s',sz,cix+1);
                if ( ! $(key).length ) break;
                if ( $(key2).length ) {
                    v = $(key2).val();
                    if ( v ) {
                        $(key).val(v);
                    } else {
                        $(key).val('');
                    }
                } else {
                    $(key).prop( 'checked','' );
                }
            }
        }
        // Not Available ( s_<size>_<color>
        for ( sz=removed; sz < 100; sz++ ) {
            key = sprintf('#s_%s_%s',sz,0);
            if ( ! $(key).length ) break;
            for ( cix=0; cix < 100; cix++ ) {
                key = sprintf('#s_%s_%s',sz,cix);
                key2 = sprintf('#s_%s_%s',sz,cix+1);
                if ( ! $(key).length ) break;
                if ( $(key2).length ) {
                    v = $(key2).is(':checked');
                    if ( v ) {
                        $(key).prop('checked','checked');
                    } else {
                        $(key).prop('checked','');
                    }
                } else {
                    $(key).val( '' );
                }
            }
        }
        break;
    case 'press_digital_Click_Sizes':
        // Digital press, click sizes changed
        // click_<size>_<color>_<column>
        // <size> = Click_Sizes
        // <color> = Colors_Side_1 (_color,  _black)
        colors = ['color','black'];
        for ( sz = removed; sz < 100; sz++) {
            key = sprintf('#click_%s_%s_%s',sz,0,0);
            if ( ! $(key).length ) break;
            for ( cix=0; cix < colors.length; cix++) {
                color = colors[cix];
                for ( col=0; col < 20; col++ ) {
                    key = sprintf('#click_%s_%s_%s',sz,cix,col);
                    key2 = sprintf('#click_%s_%s_%s',sz+1,cix,col);
                    if ( ! $(key).length ) break;
                    if ( $(key2).length ) {
                        $(key).val( $(key2).val() );
                    } else {
                        $(key).val( '' );
                    }
                }
            }
        }
        break;

    }
};


var get_field = function(id) {
    // get field given an html id.  The id can contain extra information.
    // For example: Colors_Side_1_color really refers to the field Colors_Side_1 (digital press example)
    var fields = get('fields');
    for (var i=0; i < fields.length; i++) {
        var field = fields[i];
        // if ( id.indexOf( field.name ) >= 0) {  // this is a logic error
        // Fixed the block below for ODY-1007
        if ( field.name === id) {
            return field;
        }
    }
    return {}; // no field found (impossible)
};

var check_broken_tasks = function( rec ) {
    // under some circumstances the code field in the task
    // has the wrong resource_id ( prior coding errors still in the
    // resources table ). this function forces the task.code and other
    // elements to match the resource_id.
    var i, task, key, v, code, k, i2, changed;
    var specs = rec.Specs;
    if ( typeof( specs ) === 'string' ) specs = JSON.parse(specs);
    var tasks = specs.Tasks;
    var id = rec.Resource_ID.toString();
    var ignore_list = ['description','show_to_customer'];
    var any_changes_made = false;
    if ( tasks && Array.isArray( tasks ) ) {
        for ( i=0; i < tasks.length; i++ ) {
            task = tasks[i];
            for ( key in task ) {
                if ( task.hasOwnProperty( key ) && ignore_list.indexOf( key ) < 0 ) {
                    v = task[key];
                    switch ( key ) {
                    case 'code':
                        code = task.code.split('_');
                        code[0] = id;
                        task.code = code.join('_');
                        break;
                    default:
                        k = key.split('_');
                        changed = false;
                        if ( k.indexOf( id ) < 0 ) {
                            // nothing in the key matches the resource_id.  this has to be a problem.
                            // find the first integer field an make it the resource id
                            for ( i2=0; i2 < k.length; i2++ ) {
                                if ( ody.verify_integer( k[i2] ) || k[i2] === 'NaN' ) {
                                    k[i2] = id;
                                    changed = true;
                                    any_changes_made = true;
                                    break;
                                }
                            }
                        }
                        if ( changed ) {
                            k = k.join('_');
                            task[k] = v;
                            delete task[key];
                        }
                        break;
                    }
                }
            }
        }
    }
    if ( any_changes_made ) {
        rec.Specs = specs;
    }
};

var update_database = function( new_edit ) {
    var id = get('id'); // id we are changing

    // we are updating an existing record

    var original = get('original_resource');
    var changes = {};

    var l = ['Name','Vendor','Dept_ID'];
    for (var i=0; i < l.length; i++) {
        var n = l[i];
        if (original[n] != new_edit[n]) {  // purposely letting it convert type for compare
            changes[n] = new_edit[n];
        }
    }

    // if we are saving, just assume something changed in Specs :)
    check_broken_tasks( new_edit );
    if ( typeof( new_edit.Specs ) !== 'string' ) {
        changes.Specs = JSON.stringify( new_edit.Specs );
    }

    var data = { Table: 'resources', Fields: changes, Conditions: { Resource_ID: parseInt( original.Resource_ID ) } };

    Meteor.call('fetchFromAPI', 'updateSingleRow', data, Session.get( 'vKey' ), function(err, results) {
            if (err) {
                console.log('Error: Problem in resource change. err=' + err);
            } else {
                if ( results.error ) {
                    console.log('Possible problem in resource change. ' + results.error);
                    console.log(data);
                } else {
                    console.log('successful resource update');
                }
                update_dept( new_edit );
                checkForPagesPerMinuteIssues();
            }
        });
};

const checkForPagesPerMinuteIssues = function() {
  // There is a strange issue that happens with the Pages_Per_Minute table of values.
  // If you add a new size and ppm value and the next thing you do is click Save, for some reason
  // it duplicates the html fields.  I tried for a long time to figure out why and fix the root cause
  // but was unable to do so.  The hack here is to check for the problem and fix it after the fact.
  if ( $('#ppm_flex_0').length) {
    // see if we have more than one
    let list = $('#ppm_flex_0').parent().html().split('\n');
    let count = 0;
    let ix = 0;
    for ( let i=0; i < list.length; i++ ) {
      let l = list[i];
      if ( l.indexOf('ppm_flex_0') >= 0 ) {
        count += 1;
        if ( count === 2 ) ix = i;
      }
    }
    if ( count > 1 ) {
      // clear up the html by removing the 2nd copy of the data
      let html = [];
      for ( let i=0; i < ix; i++ ) {
        html.push( list[i]);
      }
      $('#ppm_flex_0').parent().html(html.join('\n'));
    }
  }
};


var new_row_in_database = function( new_edit ) {
    // we are creating a new resource

    var tasks = new_edit.Specs.Tasks;
    if ( ! Array.isArray( tasks ) || tasks.length === 0 ) {
        // no actual tasks defined
        tasks = '';
    }

    if ( typeof( new_edit.Specs ) !== 'string' ) {
        new_edit.Specs = JSON.stringify( new_edit.Specs );
    }

    var t = get_type();
    new_edit.Type_ID = t.Type_ID;
    var o = get('original_resource');
    o.Type_ID = new_edit.Type_ID;
    set('original_resource',o);

    var data = { Table: 'resources', Fields: new_edit };
    Meteor.call('fetchFromAPI', 'addSingleRow', data, Session.get( 'vKey' ), function(err, results) {
            if (err) {
                console.log('Error: Problem in resource add new. err=' + err);
            } else {
                if ( results.error ) {
                    console.log('Error: Problem adding resource. ' + results.error );
                } else {
                    console.log('successful. added new resource');
                    // update resources list
                    var resources = get('resources');
                    new_edit.Resource_ID = results.Resource_ID;
                    resources.push( new_edit );
                    set('id', parseInt(new_edit.Resource_ID));
                    set('resources', resources);

                    if ( tasks ) update_tasks( tasks, results );
                    update_dept( new_edit );
                }
             }
        });
};

var update_tasks = function( tasks, rec ) {
    // we have added a new resource and tasks were defined.  We need to set all
    // task values to the correct resource "id".  "rec" has the record we added.
    var v, id, i, task, key, new_task, new_tasks;

    check_broken_tasks( rec );
    var specs = rec.Specs;
    if ( typeof(specs) !== 'string' ) {
        specs = JSON.stringify( specs );
    }
    var changes = { Specs: specs };

    var data = { Table: 'resources', Fields: changes, Conditions: { Resource_ID: parseInt( rec.Resource_ID ) } };

    Meteor.call('fetchFromAPI', 'updateSingleRow', data, Session.get( 'vKey' ), function(err, results) {
            if (err) {
                console.log('Error: Problem in resource task update. err=' + err);
            } else {
                if ( results.error ) {
                    console.log('Possible problem in resource task update. ' + results.error);
                } else {
                    console.log('tasks modified with new Resource_ID');
                }
            }
        });
};

var special_dept_handling = function() {
    // for these resource types, we need to update Dept_ID when resource changes!
    var list = ['paper_sheets','paper_rolls','envelopes','ink'];
    var current = get('current');
    if ( list.indexOf(current) < 0 ) return false;
    return true;
};

var init_dept = function( resource ) {
    // department needs to be set from resource
    /* no it doesn't
    var current = get('current');
    var types = get('resourceTypes');
    for (var i=0; i < types.length; i++)  {
        var type = types[i];
        if ( type.Code === current ) {
            var id = parseInt( type.Dept_ID );
            resource.Dept_ID = id.toString();
            resource.Specs.Dept_ID = id.toString();
            break;
        }
    }
    */
};

var all_valid = function( list ) {
    for ( var i=0; i < list.length; i++) {
        var v = list[i];
        if ( isNaN(v) || ! v ) return false;
    }
    return true;
};

var update_dept = function(edit) {
    if ( !special_dept_handling() ) return;

    // on these resource types, when we change one resource, we change them all!
    // we need to go through each resource and make the change
    Meteor.call( 'get_printshop_id', Session.get('vKey'), function( err, printshop_id ) {
            if ( err ) {
                console.log("Problem getting printshop id: %s",err);
            } else {
                var type_id = parseInt( get('original_resource').Type_ID );
                var dept_id = parseInt( edit.Dept_ID );
                if ( all_valid( printshop_id, type_id, dept_id ) ) {
                    Meteor.call('update_all_depts_for_resource', printshop_id, dept_id, type_id, Session.get('vKey'), function(err,data) {
                            if ( err ) {
                                console.log('Error on server calling update_all_depts: %s',err);
                            } else if ( data.error ) {
                                console.log( data );
                            } else if ( data.list ) {
                                var list = data.list;
                                if ( Array.isArray( list ) && list.length > 0 ) {
                                    console.log(data.message);
                                } else {
                                    // nothing to update
                                    console.log( data );
                                }
                            }
                        } );
                } else {
                    console.log('Problem with updating departments: printshop_id: %s type_id=%s dept_id=%s',printshop_id,type_id,dept_id);
                }
            }
        } );
};

var get_edit = function( force ) {
    // force: if defined is an index into edit array if groups are active
    var edit = get('edit');
    if ( get('groups_active') ) {
        var cur = get('group_current');
        if ( typeof(force) !== 'undefined') cur = force;
        if ( Array.isArray( edit ) ) edit = edit[ cur ];
    }
    return edit;
};

var get_edit_ready = function() {
    // return a "resource" ready edit
    var edit = get('edit');
    var fields = get('fields');
    var new_edit = { Specs: edit };
    if ( get('groups_active') ) {
        if ( Array.isArray( edit ) ) edit = edit[ 0 ];
    }

    for (var i=0; i < fields.length; i++ ) {
        var field = fields[i];
        if ( field.mapsto ) {
            new_edit[ field.mapsto ] = edit[ field.name ];
        }
    }
    return new_edit;

};

var clear_default_calc = function( edit ) {
    // if the custom calc matches the default custom calc - clear it out
    var specs = edit.Specs;
    if ( Array.isArray( specs ) ) specs = specs[0];
    if ( typeof(specs) === 'undefined' ) specs = {};
    var code = specs.Custom_Code;
    if (!code) return; // nothing there - nothing to do

    if ( code === ody.default_calc() ) {
        // blank it out if code matches the default
        specs.Custom_Code = '';
    }
};

var save_changes = function( ) {

    set('warning_message', '');
    if ( errors_found() ) {
        // do not save if any errors found
        return;
    }

    // no errors - we can save
    var current_id = get('mode');

    // Case of 'resource' view
    if ( current_id === 0) {
        // the resources are on the screen and can be saved
        var new_edit = update_fields();
    } else {
        // resources not on screen, make new_edit complete

        // Case of 'calculate' view
        if ( current_id === 1) {
            // sample calculation is on the screen - save it
            ody.set_calc_qty();
            update_edit( 'Calc_Qty', get('Calc_Qty'), 0 );
        }

        // Case of 'custom' view
        if ( current_id === 2) {
            // custom calc is on the screen - save it
            update_edit( 'Custom_Code', $('#calc_text').val(), 0 );
        }

        // Case of 'task' view
        if ( current_id === 3) {  
            // tasks are on screen
        }
        // setup new_edit
        var new_edit = get_edit_ready();
    }

    // Run_Code_After is an odd-ball case, not part of normal "fields"
    if ( get('groups_active') ) {
        new_edit.Specs[0].Run_Code_After = get('run_code_after');
        new_edit.Specs[0].Run_Last = get('run_last');
    } else {
        new_edit.Specs.Run_Code_After = get('run_code_after');
        new_edit.Specs.Run_Last = get('run_last');
    }

    clear_default_calc( new_edit );

    // update resources
    var resources = get('resources');
    var id = get('id');
    if (id > 0) {
        // updating existing row
        for (var i=0; i < resources.length; i++) {
            var resource = resources[i];
            if ( parseInt(resource.Resource_ID) === id) {
                set('original_resource', resource);
                new_edit.Resource_ID = resource.Resource_ID;
                new_edit.Type_ID = resource.Type_ID;
                resources[i] = new_edit;
                set('resources', resources);
                update_database( new_edit );
                break;
            }
        }
    } else {
        // adding a new row
        if ( get('groups_active' ) ) {
            if ( new_edit.Specs.length < 2 ) {
                // we can't allow them to save with no configurations
                set('warning_message', 'Sorry.  You must add at least one configuration before saving.');
                return;
            }
        }
        new_row_in_database( new_edit );
    }

    set('changes_saved', true);
    set('has_changed', false);
    set('no_cancel', false );
};

var group_task_mode = function() {
    // return true if we are in group task mode

    if ( !get('groups_active' ) ) return false;  // no groups
    var cur = get('group_current');

    var gtm = get('group_task_mode');
    if (typeof(gtm) === 'undefined') gtm = {};
    if ( gtm[cur] ) return true;
    return false;
};

var check_for_bad_characters = function( fields, edit, ix1, ix2 ) {

    var has_bad = function(v) {
        if ( v.indexOf('"') >= 0 ) return true;
        return false;
    };

    let errors = [];
    for ( let i = ix1; i < ix2; i++ ) {
        let f = fields[i];
        if ( f.type === 'str' ) {
            let id = '#' + f.name;
            if ( $(id).length ) {
                let v = $(id).val();
                if ( has_bad(v) ) {
                    errors.push( { field: f, id: f.name } );
                }
            }
        }
    }

    return errors;
};

var not_paper = function() {
    // return true if the current resource is not a paper
    let list = get('resourceTypes');
    let ids = {};  // paper resource ids
    for ( let i=0; i < list.length; i++ ) {
        let l = list[i];
        if ( l.Code.substr(0,6) === 'paper_' || l.Code === 'substrate'
             || l.Code === 'envelopes' ) {
            ids[ parseInt( l.Type_ID ) ] = true;
        }
    }
    let original = get('original_resource');
    let id;
    if ( original.Type_ID ) {
        id = parseInt( get('original_resource').Type_ID );
    } else {
        // must be adding a new resource, no original found
        let t = get_type();
        id = parseInt( t.Type_ID );
    }
    if ( ids[id] ) return false;  // it is a paper
    return true;
};

var not_press = function() {
    // return true if the current resource is not a press
    let list = get('resourceTypes');
    let ids = {};  // paper resource ids
    for ( let i=0; i < list.length; i++ ) {
        let l = list[i];
        if ( l.Code.substr(0,6) === 'press_' ) {
            ids[ parseInt( l.Type_ID ) ] = true;
        }
    }
    let original = get('original_resource');
    let id;
    if ( original.Type_ID ) {
        id = parseInt( get('original_resource').Type_ID );
    } else {
        // must be adding a new resource, no original found
        let t = get_type();
        id = parseInt( t.Type_ID );
    }
    if ( ids[id] ) return false;  // it is a paper
    return true;
};

var errors_found = function() {
    clear_errors();
    var current_id = get('mode');
    if ( current_id !== 0 || group_task_mode() ) return false; // no errors to check not on resource tab

    var range = get_field_range();
    var errors = ody.check_fields( get('fields'), get_edit(), range.ix1, range.ix2 );

    if ( errors.length === 0 ) {
        // no "normal" errors, check for bad characters
        errors = check_for_bad_characters( get('fields'), get_edit(), range.ix1, range.ix2 );
    }
    if ( errors.length === 0 && not_paper() && not_press() ) {
        // since "Description" will later form and "id" in an html page, it must be a valid id value
        // except for paper!
        let id = 'Description';
        let f = get_field(id);
        if ( ! ody.valid_html_id( $('#'+f.name).val(), 'space_ok' ) ) {
            errors.push( { field: f, id: f.name } );
        }
    }
    if (errors.length > 0) {
        // we have errors with the current fields on the screen
        // so we can't switch to another tab
        set('errors', errors);
        // we have errors - set backgrounds to red
        for (var i=0; i < errors.length; i++) {
            var id = errors[i].id;
            $('#' + id).css({'border': '2px solid rgba(190, 30, 45, .5)', 'background-color': 'rgba(190, 30, 45, .05)'});
        }
        $('#' + errors[0].id).focus();  // focus on the first error
        return true;
    }
    return false;
};

var delete_config = function() {
    // delete current config
    var edit = get('edit');
    var cur = get('group_current');
    edit.splice(cur, 1);
    if ( cur >= edit.length ) {
        cur = edit.length - 1;
        set('group_current',cur);
    }
    set('edit',edit);
};

var update_edit = function( n, new_value, force) {
    var edit = get('edit');
    if ( get('groups_active') ) {
        var cur = get('group_current');
        if ( typeof(force) !== 'undefined' ) cur = force;
        edit[ cur ][ n ] = new_value;
    } else {
        edit[ n ] = new_value;
    }
    set('edit', edit);
};

var get_field_range = function() {
    var fields = get('fields');
    if ( get('groups_active') ) {
        var gi = get('group_indexes');
        if ( get('group_current') === 0 ) {
            var ix1 = 0;
            var ix2 = gi[1];
        } else {
            var ix1 = gi[1];
            var ix2 = fields.length;
        }
    } else {
        var ix1 = 0;
        var ix2 = fields.length;
    }
    return { ix1: ix1, ix2: ix2 };
};

var update_fields = function() {
    // copy browser fields into 'edit' session variable
    // return finished record suitable for saving
    var rec;
    var edit = get('edit');
    var fields = get('fields');
    var mode = get('mode');
    if ( get('groups_active') ) {
        if ( mode === 3) {
            // task is being shown, not group - so we can't read html for group right now
            rec = {};
            rec.Name = edit[0].Press_ID;
            rec.Vendor = edit[0].Vendor;
            rec.Specs = edit;
            return rec;
        } else if (mode === 0){
            // need to update current config only
            var cur = get('group_current'); // from this config
            var range = get_field_range();
            rec = ody.update_fields( fields, edit[ cur ], range.ix1, range.ix2 );
            if ( typeof(edit[cur]) === 'undefined') edit[cur] = {};
            var tasks = edit[cur].Tasks;
            if (tasks) rec.Specs.Tasks = tasks;
            edit[ cur ] = rec.Specs;
            set('edit', edit);
            rec.Specs = [];

            for ( var i=0; i < edit.length; i++) {
                rec.Specs.push( edit[i] );
            }
            rec.Name = edit[0].Press_ID;
            rec.Vendor = edit[0].Vendor;
            return rec;
        }
    } else {
        // update one and only config
        var tasks = edit.Tasks;
        var rec = ody.update_fields( fields, edit );
        edit = rec.Specs;
        if (tasks) edit.Tasks = tasks;
        set('edit', edit);
        return rec;
    }
};

var add_local_tag = function(v) {
    // add tag to out local list of tag values
    if (!v) return;
    var edit = get_edit();
    var tags = force_array(edit.Tags);
		var val = make_array(v);
		var updated = false;
		for( var i = 0; i < val.length; i++ ) {
			var ok = true;
			v = val[i];
			for (var j=0; j < tags.length; j++) {
				var tag = tags[j];
				if ( tag.toLowerCase() === v.toLowerCase()) {
						ok = false;
						break;
				}
			}
			if (ok) {
				updated = true;
				tags.push(v);
			}
		}
		if( updated ) update_edit( 'Tags', tags );
};

var add_global_tag = function(v) {
    if (!v) return;
    var tags = force_array(get('tags'));
		var val = make_array(v);
		var updated = false;
		for( var i = 0; i < val.length; i++ ) {
			var ok = true;
			v = val[i];
			for (var j=0; j < tags.length; j++) {
				var tag = tags[j];
				if ( tag.toLowerCase() === v.toLowerCase()) {
					ok = false;
					break;
				}
			}
			if (ok) {
				updated = true;
				tags.push(v);
			}
		}
		if( updated ) set('tags',tags);
};

var add_local_adhoc = function(v, name) {
    // add adhoc to our local list of adhoc values
    if (!v) return;
    var edit = get_edit();
    var adhocs = force_array(edit[ name ]);
    var ok = true;
    for (var i=0; i < adhocs.length; i++) {
        var adhoc = adhocs[i];
        if ( adhoc.toLowerCase() === v.toLowerCase()) {
            ok = false;
            break;
        }
    }
    if (ok) {
        adhocs.push(v);
        update_edit( name, adhocs);
    }
};

var add_global_adhoc = function(v, name) {
    if (!v) return;

    var rec = ody.get_value_from_settings( name, get('settings') );
    if ( ! rec.Text ) rec.Text = [];
    var adhocs = rec.Text;
    var ok = true;
    for (var i=0; i < adhocs.length; i++) {
        var adhoc = adhocs[i];
        if ( adhoc.toLowerCase() === v.toLowerCase()) {
            ok = false;
            break;
        }
    }
    if (ok) {
        rec.Text.push(v);

        // update local settings
        var settings = get('settings');
        for ( var i=0; i < settings.length; i++ ) {
            var setting = settings[i];
            if ( setting.Setting === name ) {
                settings[i] = rec;
                set('settings', settings);
                break;
            }
        }

        // update database with settings change
        ody.set_settings( rec, function(id) {
                console.log('settings updated with new adhoc');
            });

        // set value of drop-down
        Meteor.setTimeout( function() {
          $('.adhoc_select').each(function(i, obj) {
                  var data = $(obj).attr('data');
                  if ( data === name ) {
                      v = $(obj).val(v);
                  }
              });

            }, 200);
    }
};

var force_array = function(v) {
    if ( !jQuery.isArray(v) ) return [];
    return v;
};

var make_array = function(v) {
	v = v.split( ',' );
	for( var i = 0; i < v.length; i++ ) {
		v[i] = v[i].trim();
	}
	return v;
};

var set_group_task_mode = function(id) {
    Meteor.setTimeout(function() {
        var gtm = get('group_task_mode');
        if (typeof(gtm) === 'undefined') gtm = {};
        gtm[id] = true;
        update_fields();
        set('group_task_mode', gtm);
        set('mode', 3);
    });
};

var go_to_task_view = function(task_index) {
    Meteor.setTimeout(function() {
        set('task_index', task_index);
        $('#add_task_trigger').click();
    }, 500);
};

var copy_price_down = function( data ) {
    // copy price from first row down the entire column
    // this should be for Paper Cost Table only
    var col1, col2, v, id;
    if ( data === 'all' ) {
        col1 = 0;
        col2 = 1000;
    } else {
        col1 = parseInt( data );
        col2 = col1 + 1;
    }
    var done = false;
    for ( var col=col1; col < col2; col++ ) {
        for ( var row=0; row < 1000; row++ ) {
            id = sprintf('#p_%s_%s',col,row);
            if ( ! $(id).length ) {
                if ( row === 0 ) done = true;
                break;
            }
            if ( row === 0 ) {
                v = $(id).val();
            } else {
                $(id).val(v);
            }
        }
        if ( done ) break;
    }
};


const addNewPagesPerMinute = function(){
  // pages per minute for digital presses is a special case.  We have a list of size/value pairs
  // that can be edited
  let field = 'Pages_Per_Minute';
  let size = $('#ppm_size_new').val();
  let ppm = $('#ppm_value_new').val();
  if ( size && ppm ) {
    // we have completed both fields
    let value = ody.ppm_value(field)
    // we're not checking for errors at this point, just adding the value
    value.push( { size: size, value: ppm });
    const rec = {};
    rec[field] = value;
    const html = ody.ppm_html(field,rec);
    $('#ppm_flex_0').parent().html(html);
    Meteor.setTimeout(function(){
      $('#ppm_size_new').focus();
    },200);
  }
};

Template.resource_edit.events({
    'click #global_paper_diff': function(e){
      console.log('jones577');
      set('pressRunPopupActive',true);
    },
    'change #ppm_size_new': function(e){
      addNewPagesPerMinute();
    },
    'change #ppm_value_new': function(e){
      addNewPagesPerMinute();
    },
    'click #edit_alternate_sheets': function( e ) {
        var edit = get('edit');
        edit.Resource_ID = get('id');
        edit.Type_ID = get_type().Type_ID;
        Session.set('sister_sheets_edit', edit );
        set('edit_alternate_sheets','sister_sheets');
        Meteor.setTimeout( function() {
                $('#alternate_sheets_popup').show();
            }, 200);
    },
    'click .copy_price_down': function( e ) {
        var data = $( e.currentTarget ).attr('data');
        copy_price_down( data );
    },
    'change #ncr_parts': function( e ) {
        var v = parseInt( $('#ncr_parts').val() );
        if ( isNaN(v) ) v = 0;
        if ( v < 2 ) {
            $('#ncr_radio').show();
        } else {
            $('#ncr_radio').hide();
        }
        $('#ncr_parts').focus();
    },
    'click .res_help_icon': function( e ) {
        // The question mark help icon was clicked
        // The text for each question mark popup modal can be found in function
        //    ody.define_press_offset in ody.js.
        // The html classes that tie into the help data is found in the
        //    offsetResource function in import.js. This information ties the html
        //    class to the help information in function ody.define_press_offset in ody.js.
        // console.log('the question mark help icon was clicked', id);
        var id = $( e.currentTarget ).attr('data');
        var offset = $( e.currentTarget ).offset();
        var field = get_field(id);
        var hid = '#help_note';
        if ( $(hid).is(':visible') ) {
            $(hid).hide();
        } else {
            $(hid).css( 'left', sprintf('%spx', offset.left ));
            $(hid).css( 'top', sprintf('%spx', offset.top + 30 ));
            var html = field.help;
            html += '<p><a href="#" onclick="javascript:$(\'#help_note\').hide();">Close</a></p>';
            $(hid).html( html );
            $(hid).show();
        }
    },
    'change .change_select': function( e ) {
        // only purpose of this code is to show or hide the "List of Values" in
        // a custom resource, depending on what is selected in Type of Value
        var id = $( e.currentTarget ).attr('id');
        if ( id.length <= 8 && id.substr(0,1) === 'Q' && id.indexOf('_Type') > 1 ) {
            var v = $( e.currentTarget ).val();
            var n = id.split('_')[0].substring(1);
            var id2 = sprintf('row_Q%s_List',n);
            if ( v === 'list') {
                $('#'+id2).show();
            } else {
                $('#'+id2).hide();
            }
        }
    },
    'click .group_task_activate': function( e ) {
        if ( errors_found() ) return;
        var number_filter = /\d+$/g;
        var id = parseInt( number_filter.exec($( e.currentTarget ).attr('id') ));
        var gtm = get('group_task_mode');
        if (typeof(gtm) === 'undefined') gtm = {};
        gtm[id] = true;
        update_fields();
        set('group_task_mode',gtm);
    },
    'click .edit_a_task': function( e ) {
        var id = parseInt( $( e.currentTarget ).attr('id') );
        set('task_index', id);
        $('#add_task_trigger').click();
    },
    'click #add_task': function( e ) {
        set('task_index', -1);
        $('#add_task_trigger').click();
    },
    'click .tag_delete': function( e ) {
        var id = parseInt( $( e.currentTarget ).attr('id') );
        var edit = get_edit();
        var tags = edit.Tags;
        tags.splice(id,1);
        update_edit('Tags',tags);
    },
    'change .tag_text': function( e ) {
			var $this = $( e.currentTarget );
			var v = $this.val();
			add_global_tag(v);
			add_local_tag(v);
			Meteor.setTimeout( function() {
				$( 'input.tag_text' ).focus();
			}, 200 );
    },
		'keydown .tag_text': function( e ) {
			if( e.which == 188 ) { // comma
				e.preventDefault();
				$( e.currentTarget ).change();
			}
		},
    'change .tag_select': function( e ) {
        var v = $( e.currentTarget ).val();
        add_local_tag(v);
    },
    'change .adhoc_text': function( e ) {
        var v = $( e.currentTarget ).val();
        var name = $( e.currentTarget ).attr('data');
        add_global_adhoc(v, name);
        //add_local_adhoc(v, name);
    },
    'change .adhoc_select': function( e ) {
        var v = $( e.currentTarget ).val();
        var name = $( e.currentTarget ).attr('data');
        //add_local_adhoc(v, name);
    },
    'click .change_calc': function( e ) {
        // user clicked button on left (resource, sample calc or custom calc)
        // change from 0=normal (resource)  1=test calc  2=custom calc definition
        var number_filter = /\d+$/g;
        var id = parseInt( number_filter.exec($( e.currentTarget ).attr('id') )); // switch to this config
        change_mode(id);
    },
    'click .chk-off': function( e ) {
        var id = $( e.currentTarget ).attr('id');
        update_boolean_value( id, 0);
    },
    'click .chk-on': function( e ) {
        var id = $( e.currentTarget ).attr('id');
        update_boolean_value( id, 1);
    },
    'keydown .special-x': function( e ) {
        // check key pressed, if x, then go to next field
        if ( e.keyCode === 88) {
            // user typed an "x" on width, move cursor to height
            e.preventDefault(); // don't show x in length field
            var obj = e.currentTarget;
            var id = $( obj ).attr('id');
            var v = $( obj ).val();
            v = v.toLowerCase().replace('x','');
            $( obj ).val( v );
            id = id.substr(0, id.length-1) + '1';
            $('#' + id ).focus();
        }
    },
    'click .save-changes': function( e ) {
        save_changes();
    },
    'change .input-react': function( e ) {
        // reactive element has been changed
        var id = $(e.currentTarget).attr('id');
        var field = get_field(id);
        var value = ody.field_value( field );
        var edit = get('edit');

        if ( get('groups_active') ) {
            edit[ get('group_current') ][ field.name ] = value;
        } else {
            edit[ field.name ] = value;
        }

        set('edit',edit);
    },
    'change .text-list-change': function( e ) {
        // we changed an existing text-list value
        var id = $(e.currentTarget).attr('id');
        // Change Sizes_1 to Sizes (for example)
        id = id.split('_');
        var ix = id.splice( id.length-1, 1 ); // remove last value
        id = id.join('_');
        var values = get_text_list_values( id );
        update_edit( id, values );
        Meteor.setTimeout( function(){
                var key = '#' + id + '_' + ( parseInt(ix) + 1 );
                if ( $(key).length) {
                    $(key).focus();
                } else {
                    $('#' + id).focus();
                }
            }, 100);
    },
    'blur .text-list': function( e ) {
        // we added something new to a list of text values
        var new_value = $(e.currentTarget).val();
        if (!new_value) return; // nothing added
        var id = $(e.currentTarget).attr('id');
        var values = get_text_list_values( id );
        values.push( new_value );
        update_edit( id, values );
        Meteor.setTimeout(function(){
                $('#' + id).focus();
            },60);
    },
    'click form.search-bar a.search-clear': function( e ) {
        e.preventDefault();
        e.stopPropagation();
        var $this = $( e.currentTarget );
        $this.closest('form').find('input[type=text]').val('').focus();
        $this.css({
                'visibility': 'hidden',
                    'opacity': 0
                    });
    },
    'click #add_config': function( e ) {
        // add a new configurtion
        if ( errors_found() ) return;
        update_fields();
        var cur = get('group_current'); // store current information
        var edit = get('edit');
        var o = { Description: 'New Config' };
        if ( edit.length > 1) {
            // we have another config - use that as a starting point
            if ( cur > 0 ) {
                // copy from current config
                o = ody.copy( edit[ cur ] );
            } else {
                // copy from last config
                o = ody.copy( edit[ edit.length-1 ] );
            }
            o.Description += ' (copy)';
        } else {
            // fill in default values
            set_defaults( o );
        }
        edit.push( o );
        set('edit',edit);
        set('group_current', edit.length - 1);
    },
    'click .change_config': function( e ) {
        var number_filter = /\d+$/g;
        var id = parseInt( number_filter.exec($( e.currentTarget ).attr('id') )); // switch to this config
        change_mode(0);
        // do not change config if errors found
        if ( ! get('change_mode_errors') ) change_config( id );
    },
    'click #delete_config': function( e ) {
        delete_config();
    },
    'click .decrement': function( e ) {
        e.preventDefault();
        e.stopPropagation();
        $this = $(e.target);
        var targetInputField = $this.prev();
        var currValue = parseInt(targetInputField.val());
        targetInputField.val(currValue - 1);
    },
    'click .increment': function( e ) {
        e.preventDefault();
        e.stopPropagation();
        $this = $(e.target);
        var targetInputField = $this.prev().prev();
        var currValue = parseInt(targetInputField.val());
        targetInputField.val(currValue + 1);
    },
    'click .styled-checkbox': function( e ){
        var clicked_element = $(e.target);
        var associated_input = clicked_element.prev();
        if(associated_input.prop("checked")){
            associated_input.prop("checked", false);
            clicked_element.removeClass("fa-times");
            clicked_element.addClass("fa-check");
        } else {
            associated_input.prop("checked", true);
            clicked_element.removeClass("fa-check");
            clicked_element.addClass("fa-times");
        }
    },
    'click .add_task': function (e) {
        var configuration_id_filter = /\d+/;
        var configuration_id = parseInt( configuration_id_filter.exec($( e.currentTarget ).attr('id') ));
        change_mode(3);
        set('group_current', configuration_id );

        //set_group_task_mode(configuration_id);
        go_to_task_view(-1);
    },
    'click .view_task': function(e){
        var configuration_id_filter = /\d+/;
        var configuration_id = parseInt( configuration_id_filter.exec($( e.currentTarget ).attr('id') ));
        change_mode(3);
        change_config( configuration_id );

        // if ( errors_found() ) return;
        // set_group_task_mode(configuration_id);

        var task_id_filter = /\d+$/;
        var task_id = parseInt( task_id_filter.exec($( e.currentTarget ).attr('id') ));
        go_to_task_view(task_id);
    },
    'change input, keyup input, change select, keyup textarea, change textarea, click .chk-switch, click .increment, click .decrement, click .tag_delete': function(e){
        set('changes_saved', false);
        set('has_changed', true);
    }
});

var change_config = function(id) {
    set('group_current', id);

    Meteor.setTimeout( function(){
        // when we add a new configuration, change something, then change
        // to another configuration, the html renders with the old info, not the new
        // this function sets the html fields in the browser after a short delay.
        var fields = get('fields');
        var cur = get('group_current'); // from this config
        var gi = get('group_indexes');
        ix1 = gi[1];
        ix2 = fields.length;
        if ( cur === 0) {
            ix1 = 0;
            ix2 = gi[1];
        }
        ody.fill_html_fields( fields, get_edit(), ix1);
    }, 200);

};

var update_boolean_value = function( id, new_value) {
    id = id.split('_');
    var field_no = parseInt( id[ id.length-1 ] );
    var field = get('fields')[ field_no ];
    var $field = $('#' + field.name);
    var new_value = '';
    if($field.val()==1){
        new_value = 0;
    } else {
        new_value = 1;
    }
    $field.val( new_value );
    update_edit( field.name, new_value);
};

var change_calc = function(id) {
    // user clicked button on left (resource, sample calc or custom calc)
    // change from 0=normal (resource)  1=test calc  2=custom calc definition

    var groups = get('groups_active');

    var current_mode = get('mode');
    if ( current_mode === 0) {
        // we are switching from resource to one of the calculation tabs, make sure no errors
        if ( errors_found() ) return;
        if ( groups ) {
            update_fields();
            set('calc_standards', ody.current_config_standards());
        } else {
            var edit = update_fields();
            set('calc_standards', edit.Specs);
        }
        if ( groups ) set('group_current',-1);
    }
    if ( current_mode === 1) {
        // we are switching from calculation sample to something else
        // save the quantity and other information
        ody.set_calc_qty();
    }
    if ( current_mode === 2) {
        // we are switching from custom calc to something else
        // set the custom code
        update_edit( 'Custom_Code', $('#calc_text').val(), 0 );
    }

    set('global_table_active', false); // used in Custom Calculation (custom_calc.js)
    set('mode', id );
};

var change_mode = function(new_mode){
    // Switching modes, need to do some housecleaning first...

    var groups = get('groups_active');

    set('change_mode_errors',false);
    var current_mode = get('mode');
    if ( current_mode === 0) {
        // we are switching from resource, make sure no errors
        if ( errors_found() ){
            console.log('errors found! exiting...');
            set('change_mode_errors',true);
            return;
        }
        if ( groups ) {
            update_fields();
            set('calc_standards', ody.current_config_standards());
        } else {
            var edit = update_fields();
            set('calc_standards', edit.Specs);
        }
    }
    if ( current_mode === 1) {
        // we are switching from calculation sample to something else
        // save the quantity and other information
        ody.set_calc_qty();
    }
    if ( current_mode === 2) {
        // we are switching from custom calc to something else
        // set the custom code
        update_edit( 'Custom_Code', $('#calc_text').val(), 0 );
    }
    if ( current_mode === 3) {
        // what needs to be cleaned up before switching out of task mode?
        set('group_task_mode', {});
    }

    set('global_table_active', false); // used in Custom Calculation (custom_calc.js)
    set('mode', new_mode);
}

$(window).scroll(placeHeader);
function placeHeader() {
    // if header can't fit fully on screen, pop out of page and fix to top.
    // otherwise, leave it in-page
    // using top of sidebar as proxy for when top of header would be on/off page...

    if ( ! $('#sidebar').length ) return;  // ignore if sidebar on not screen

    var topOfHeader = $('#sidebar').offset().top;
    var topOfWindow = $(window).scrollTop();
    var headerScreenPosition = topOfHeader - topOfWindow;

    if(headerScreenPosition >= 0){
        // header on screen, place it in-page...
        $('#content_header').css({'position':'static'});
    } else {
        // header off screen, fix to top of page...
        $('#content_header').css({'position':'relative', 'top':Math.abs(headerScreenPosition)});
    }
}
