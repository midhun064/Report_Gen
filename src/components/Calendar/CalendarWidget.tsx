import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userFormsService, UserFormData } from '../../services/userFormsService';

interface CalendarEvent {
  date: string;
  type: string;
  title: string;
  status: string;
  formId?: number;
  isRangeStart?: boolean;
  isRangeEnd?: boolean;
  isRangeMiddle?: boolean;
  rangeId?: string;
}

interface CalendarWidgetProps {
  className?: string;
}

// Helper to format Date -> YYYY-MM-DD in local time
const formatDateLocal = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const CalendarWidget: React.FC<CalendarWidgetProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Holiday state
  interface HolidayInfo{date:string;name:string;type:'national'|'festival'|'public'}
  const [holidays,setHolidays]=useState<Map<string,HolidayInfo>>(new Map());
  const [holidayCache, setHolidayCache] = useState<Map<number, HolidayInfo[]>>(new Map());

  // Google Calendar API configuration
  const GOOGLE_API_KEY = 'AIzaSyDCNHThfwausN-D0qMEwjSdM8DbPW0KPLQ';
  
  // Public holiday calendar IDs for India
  const CALENDAR_IDS = {
    indian_holidays: 'en.indian%23holiday@group.v.calendar.google.com',
    hindu_holidays: 'en.hinduism%23holiday@group.v.calendar.google.com',
  };

  // Categorize holidays based on keywords
  const categorizeHoliday = (summary: string): 'national' | 'festival' | 'public' => {
    const summaryLower = summary.toLowerCase();
    
    // National holidays
    const nationalKeywords = ['republic day', 'independence day', 'gandhi jayanti'];
    if (nationalKeywords.some(keyword => summaryLower.includes(keyword))) {
      return 'national';
    }
    
    // Festivals
    const festivalKeywords = [
      'diwali', 'holi', 'eid', 'dussehra', 'durga puja', 'ganesh chaturthi',
      'janmashtami', 'navratri', 'pongal', 'onam', 'baisakhi', 'ugadi',
      'raksha bandhan', 'ram navami', 'mahashivratri', 'guru nanak',
      'buddha purnima', 'christmas', 'good friday', 'easter'
    ];
    if (festivalKeywords.some(keyword => summaryLower.includes(keyword))) {
      return 'festival';
    }
    
    // Default to public
    return 'public';
  };

  // Fetch holidays from Google Calendar API
  const fetchHolidaysFromGoogle = async (year: number): Promise<HolidayInfo[]> => {
    try {
      // Check cache first
      if (holidayCache.has(year)) {
        console.log(`✅ Using cached holidays for ${year}`);
        return holidayCache.get(year)!;
      }

      console.log(`🔍 Fetching holidays from Google Calendar API for ${year}`);
      
      const allHolidays: HolidayInfo[] = [];
      
      // Fetch from both calendars
      for (const [calendarName, calendarId] of Object.entries(CALENDAR_IDS)) {
        const timeMin = `${year}-01-01T00:00:00Z`;
        const timeMax = `${year}-12-31T23:59:59Z`;
        
        const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${GOOGLE_API_KEY}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=100`;
        
        try {
          const response = await fetch(url);
          
          if (!response.ok) {
            console.error(`❌ Google Calendar API error for ${calendarName}:`, response.status, response.statusText);
            continue;
          }
          
          const data = await response.json();
          
          if (data.items && Array.isArray(data.items)) {
            console.log(`✅ Fetched ${data.items.length} holidays from ${calendarName} for ${year}`);
            
            data.items.forEach((event: any) => {
              if (event.start && (event.start.date || event.start.dateTime)) {
                const dateStr = event.start.date || event.start.dateTime.split('T')[0];
                const holidayType = categorizeHoliday(event.summary);
                
                allHolidays.push({
                  date: dateStr,
                  name: event.summary,
                  type: holidayType
                });
              }
            });
          }
        } catch (error) {
          console.error(`❌ Error fetching from ${calendarName}:`, error);
        }
      }
      
      // Remove duplicates (same date and name)
      const uniqueHolidays = allHolidays.filter((holiday, index, self) =>
        index === self.findIndex((h) => h.date === holiday.date && h.name === holiday.name)
      );
      
      console.log(`✅ Total unique holidays for ${year}: ${uniqueHolidays.length}`);
      
      // Cache the results
      setHolidayCache(prev => new Map(prev).set(year, uniqueHolidays));
      
      return uniqueHolidays;
    } catch (error) {
      console.error(`❌ Error fetching holidays for ${year}:`, error);
      return [];
    }
  };

  // Fetch holidays util
  const fetchHolidays = async (year: number) => {
    try {
      console.log(`📅 Fetching holidays for year: ${year}`);
      const googleHolidays = await fetchHolidaysFromGoogle(year);
      
      setHolidays(prev => {
        const newMap = new Map(prev);
        googleHolidays.forEach(holiday => {
          newMap.set(holiday.date, holiday);
        });
        return newMap;
      });
      
      console.log(`✅ Holidays loaded for ${year}: ${googleHolidays.length} holidays`);
    } catch (e) {
      console.error('❌ Holiday fetch error:', e);
    }
  };
  
  // Prefetch current, prev, next year once
  useEffect(() => {
    const y = currentDate.getFullYear();
    fetchHolidays(y - 1);
    fetchHolidays(y);
    fetchHolidays(y + 1);
  }, []);

  const isHoliday=(date:Date)=>holidays.has(formatDateLocal(date));
  const getHolidayInfo=(date:Date)=>holidays.get(formatDateLocal(date));
  const getHolidayStyle=(date:Date)=>{
    if (!isHoliday(date)) return '';
    const holiday = getHolidayInfo(date);
    switch (holiday?.type) {
      case 'national':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'festival':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'public':
        return 'bg-purple-50 border-purple-200 text-purple-800';
      default:
        return 'bg-amber-50 border-amber-200 text-amber-800';
    }
  };

  // Fetch form data and create calendar events
  useEffect(() => {
    const fetchFormData = async () => {
      if (!user?.id) {
        console.log('🔍 Calendar: No user ID available');
        return;
      }

      try {
        setIsLoading(true);
        console.log('🔍 Calendar: Fetching forms for user ID:', user.id);
        const userForms: UserFormData = await userFormsService.getUserForms(user.id);
        console.log('🔍 Calendar: Received user forms:', userForms);
        const calendarEvents: CalendarEvent[] = [];

        // Process each form type
        Object.entries(userForms).forEach(([formType, forms]) => {
          if (forms && Array.isArray(forms)) {
            console.log(`🔍 Calendar: Processing ${formType} with ${forms.length} forms`);
            forms.forEach((form: any) => {
              // Verify this form belongs to the current user
              if (form.employee_id !== user.id) {
                console.warn(`⚠️ Calendar: Form ${formType} has different employee_id (${form.employee_id}) than current user (${user.id})`);
                return; // Skip this form
              }
              // Add events for different date fields based on form type
              const datesToAdd = [];

              // Common date fields
              if (form.created_at) {
                datesToAdd.push({
                  date: form.created_at,
                  type: 'created',
                  title: `${formType.replace('-', ' ')} - Created`,
                  status: form.status || 'Unknown'
                });
              }

              // Form-specific date fields
              switch (formType) {
                case 'leave-request':
                  if (form.start_date && form.end_date) {
                    const rangeId = `leave-${form.request_id}`;
                    
                    // Parse dates as local dates to avoid timezone issues
                    const startDateStr = form.start_date.split('T')[0]; // Remove time part if present
                    const endDateStr = form.end_date.split('T')[0]; // Remove time part if present
                    
                    console.log(`🔍 Calendar: Processing leave range ${startDateStr} to ${endDateStr}`);
                    console.log(`🔍 Calendar: Original form data - start: ${form.start_date}, end: ${form.end_date}`);
                    
                    // Add start date
                    datesToAdd.push({
                      date: startDateStr,
                      type: 'leave-range',
                      title: `Leave Start - ${form.leave_type || 'Leave'}`,
                      status: form.status || 'Unknown',
                      formId: form.request_id,
                      isRangeStart: true,
                      rangeId: rangeId
                    });
                    
                    // Add end date
                    datesToAdd.push({
                      date: endDateStr,
                      type: 'leave-range',
                      title: `Leave End - ${form.leave_type || 'Leave'}`,
                      status: form.status || 'Unknown',
                      formId: form.request_id,
                      isRangeEnd: true,
                      rangeId: rangeId
                    });
                    
                    // Add middle dates if it's a multi-day leave
                    // Parse dates as local dates to avoid timezone shifts
                    const startDate = new Date(startDateStr + 'T12:00:00'); // Use noon to avoid timezone issues
                    const endDate = new Date(endDateStr + 'T12:00:00');
                    const currentDate = new Date(startDate);
                    currentDate.setDate(currentDate.getDate() + 1);
                    
                    while (currentDate < endDate) {
                      // Format date as YYYY-MM-DD
                      const year = currentDate.getFullYear();
                      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                      const day = String(currentDate.getDate()).padStart(2, '0');
                      const dateStr = `${year}-${month}-${day}`;
                      
                      console.log(`🔍 Calendar: Adding middle date: ${dateStr}`);
                      datesToAdd.push({
                        date: dateStr,
                        type: 'leave-range',
                        title: `Leave - ${form.leave_type || 'Leave'}`,
                        status: form.status || 'Unknown',
                        formId: form.request_id,
                        isRangeMiddle: true,
                        rangeId: rangeId
                      });
                      currentDate.setDate(currentDate.getDate() + 1);
                    }
                  } else if (form.start_date) {
                    // Single day leave
                    const singleDateStr = form.start_date.split('T')[0]; // Remove time part if present
                    console.log(`🔍 Calendar: Single day leave on ${singleDateStr}`);
                    datesToAdd.push({
                      date: singleDateStr,
                      type: 'leave-range',
                      title: `Leave - ${form.leave_type || 'Leave'}`,
                      status: form.status || 'Unknown',
                      formId: form.request_id,
                      isRangeStart: true,
                      isRangeEnd: true,
                      rangeId: `leave-${form.request_id}`
                    });
                  }
                  break;
                case 'training-request':
                  if (form.start_date) {
                    datesToAdd.push({
                      date: form.start_date,
                      type: 'start',
                      title: `Training Start - ${form.training_program || 'Training'}`,
                      status: form.status || 'Unknown',
                      formId: form.training_request_id
                    });
                  }
                  if (form.end_date) {
                    datesToAdd.push({
                      date: form.end_date,
                      type: 'end',
                      title: `Training End - ${form.training_program || 'Training'}`,
                      status: form.status || 'Unknown',
                      formId: form.training_request_id
                    });
                  }
                  break;
                case 'travel-request':
                  if (form.departure_date) {
                    datesToAdd.push({
                      date: form.departure_date,
                      type: 'start',
                      title: `Travel Departure - ${form.destination || 'Travel'}`,
                      status: form.status || 'Unknown',
                      formId: form.travel_request_id
                    });
                  }
                  if (form.return_date) {
                    datesToAdd.push({
                      date: form.return_date,
                      type: 'end',
                      title: `Travel Return - ${form.destination || 'Travel'}`,
                      status: form.status || 'Unknown',
                      formId: form.travel_request_id
                    });
                  }
                  break;
              }

              // Add approval dates
              if (form.line_manager_date) {
                datesToAdd.push({
                  date: form.line_manager_date,
                  type: 'approval',
                  title: `Manager Approval - ${formType.replace('-', ' ')}`,
                  status: form.line_manager_approval || 'Unknown',
                  formId: form.request_id || form.training_request_id || form.travel_request_id
                });
              }

              if (form.hr_date) {
                datesToAdd.push({
                  date: form.hr_date,
                  type: 'approval',
                  title: `HR Approval - ${formType.replace('-', ' ')}`,
                  status: form.hr_approval || 'Unknown',
                  formId: form.request_id || form.training_request_id || form.travel_request_id
                });
              }

              // Add all dates to events
              datesToAdd.forEach(event => {
                calendarEvents.push({
                  ...event,
                  date: event.date.split('T')[0] // Remove time part
                });
              });
            });
          }
        });

        console.log('🔍 Calendar: Created events:', calendarEvents);
        setEvents(calendarEvents);
      } catch (error) {
        console.error('❌ Calendar: Error fetching form data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFormData();
  }, [user?.id]);

  // Get events for a specific date
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    const dateStr = formatDateLocal(date);
    return events.filter(event => event.date === dateStr);
  };

  // Check if a date is part of a leave range
  const isDateInLeaveRange = (date: Date): boolean => {
    const dateStr = formatDateLocal(date);
    return events.some(event => 
      event.type === 'leave-range' && 
      event.date === dateStr
    );
  };

  // Check if a date is a weekend (Saturday or Sunday)
  const isWeekend = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  };

  // Get leave range styling for a date
  const getLeaveRangeStyle = (date: Date): string => {
    const dateStr = formatDateLocal(date);
    const leaveEvents = events.filter(event => 
      event.type === 'leave-range' && 
      event.date === dateStr
    );
    
    if (leaveEvents.length === 0) return '';
    
    const event = leaveEvents[0];
    let style = 'bg-red-100 border-red-300 ';
    
    if (event.isRangeStart && event.isRangeEnd) {
      // Single day leave
      style += 'rounded-full';
    } else if (event.isRangeStart) {
      // Start of range
      style += 'rounded-l-full';
    } else if (event.isRangeEnd) {
      // End of range
      style += 'rounded-r-full';
    } else {
      // Middle of range
      style += 'rounded-none';
    }
    
    return style;
  };

  // Get weekend styling for a date
  const getWeekendStyle = (date: Date): string => {
    if (isWeekend(date)) {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
    return '';
  };

  // Get days in month (Monday-based week)
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
    // Convert to Monday-based (0=Monday, 1=Tuesday, ..., 6=Sunday)
    let startingDayOfWeek = firstDay.getDay();
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

    const days: Date[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -startingDayOfWeek + i + 1));
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'bg-green-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'rejected':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Get event type color
  const getEventTypeColor = (type: string): string => {
    switch (type) {
      case 'start':
        return 'bg-blue-500';
      case 'end':
        return 'bg-purple-500';
      case 'approval':
        return 'bg-orange-500';
      case 'created':
        return 'bg-gray-500';
      case 'leave-range':
        return 'bg-red-500';
      default:
        return 'bg-indigo-500';
    }
  };

  const days = getDaysInMonth(currentDate);
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 sm:p-3 w-full ${className}`}>
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-1.5 sm:p-3 w-full ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-1 sm:mb-2">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-5 w-5 text-blue-600" />
          <h3 className="text-xs sm:text-sm font-semibold text-gray-900">Form Calendar</h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-[10px] sm:text-xs font-medium text-gray-700 min-w-[80px] sm:min-w-[100px] text-center">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <div key={day} className="text-center text-[8px] sm:text-[9px] font-medium text-gray-500 py-0.5">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {days.map((day, index) => {
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isToday = day.toDateString() === new Date().toDateString();
          const dayEvents = getEventsForDate(day);
          const isSelected = selectedDate?.toDateString() === day.toDateString();
          const isInLeaveRange = isDateInLeaveRange(day);
          const isWeekendDay = isWeekend(day);
          const isHolidayDay = isHoliday(day);
          const leaveRangeStyle = getLeaveRangeStyle(day);
          const weekendStyle = getWeekendStyle(day);
          const holidayStyle = getHolidayStyle(day);

          return (
            <div
              key={index}
              className={`
                relative h-6 sm:h-7 md:h-8 flex flex-col items-center justify-center text-xs cursor-pointer border-2
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${isToday && !isInLeaveRange && !isHolidayDay && !isWeekendDay ? 'bg-blue-100 font-bold border-blue-300' : ''}
                ${isSelected && !isInLeaveRange && !isHolidayDay && !isWeekendDay ? 'bg-blue-200 border-blue-400' : ''}
                ${!isInLeaveRange && isHolidayDay ? holidayStyle : ''}
                ${!isInLeaveRange && !isHolidayDay && isWeekendDay ? weekendStyle : ''}
                ${!isInLeaveRange && !isWeekendDay && !isHolidayDay ? 'border-transparent hover:bg-gray-100' : ''}
                ${isInLeaveRange ? leaveRangeStyle : ''}
                ${isWeekendDay ? 'hover:bg-blue-100' : ''}
                ${isInLeaveRange ? 'hover:bg-red-200' : ''}
                rounded-lg transition-colors
              `}
              onClick={() => setSelectedDate(day)}
            >
              <span className="text-[7px] sm:text-[8px] md:text-[9px]">{day.getDate()}</span>
              {(dayEvents.length>0 || isHolidayDay) && (
                <div className="flex space-x-0.5 mt-0.5">
                  {/* dots for events */}
                  {dayEvents.slice(0,2).map((event,eventIndex)=>(
                    <div
                      key={eventIndex}
                      className={`w-0.5 h-0.5 rounded-full ${getEventTypeColor(event.type)}`}
                      title={`${event.title} - ${event.status}`}
                    />
                  ))}
                  {/* holiday indicator */}
                  {isHolidayDay && (
                    <div 
                      className={`w-0.5 h-0.5 rounded-full ${
                        getHolidayInfo(day)?.type === 'national' ? 'bg-amber-500' :
                        getHolidayInfo(day)?.type === 'festival' ? 'bg-green-500' :
                        'bg-purple-500'
                      }`} 
                      title={getHolidayInfo(day)?.name} 
                    />
                  )}
                  {dayEvents.length > 2 && (
                    <div className="w-1 h-1 rounded-full bg-gray-400" title={`+${dayEvents.length - 2} more`} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Date Events */}
      {selectedDate && (
        <div className="mt-1 pt-1 border-t border-gray-200">
          <h4 className="text-[8px] sm:text-[9px] font-medium text-gray-900 mb-0.5">
            Events on {selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h4>
          <div className="space-y-0.5 max-h-12 sm:max-h-16 overflow-y-auto">
            {/* Show holidays first */}
            {isHoliday(selectedDate) && (
              <div className={`flex items-center space-x-1 p-0.5 sm:p-1 rounded-lg border ${
                getHolidayInfo(selectedDate)?.type === 'national' ? 'bg-amber-50 border-amber-200' :
                getHolidayInfo(selectedDate)?.type === 'festival' ? 'bg-green-50 border-green-200' :
                'bg-purple-50 border-purple-200'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  getHolidayInfo(selectedDate)?.type === 'national' ? 'bg-amber-500' :
                  getHolidayInfo(selectedDate)?.type === 'festival' ? 'bg-green-500' :
                  'bg-purple-500'
                }`} />
                <div className="flex-1">
                  <p className={`text-[10px] font-medium ${
                    getHolidayInfo(selectedDate)?.type === 'national' ? 'text-amber-900' :
                    getHolidayInfo(selectedDate)?.type === 'festival' ? 'text-green-900' :
                    'text-purple-900'
                  }`}>{getHolidayInfo(selectedDate)?.name}</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize ${
                      getHolidayInfo(selectedDate)?.type === 'national' ? 'bg-amber-200 text-amber-800' :
                      getHolidayInfo(selectedDate)?.type === 'festival' ? 'bg-green-200 text-green-800' :
                      'bg-purple-200 text-purple-800'
                    }`}>
                      {getHolidayInfo(selectedDate)?.type} Holiday
                    </span>
                </div>
              </div>
            )}
            
            {/* Show form events */}
            {getEventsForDate(selectedDate).map((event, index) => (
              <div
                key={index}
                className="flex items-center space-x-1 p-0.5 sm:p-1 bg-gray-50 rounded-lg"
              >
                <div className={`w-1.5 h-1.5 rounded-full ${getEventTypeColor(event.type)}`} />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-gray-900">{event.title}</p>
                  <div className="flex items-center space-x-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getStatusColor(event.status)} text-white`}>
                      {event.status}
                    </span>
                    <span className="text-[9px] text-gray-500 capitalize">{event.type}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Show message if no events */}
            {getEventsForDate(selectedDate).length === 0 && !isHoliday(selectedDate) && (
              <p className="text-[10px] text-gray-500 text-center py-1">No events on this date</p>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <h5 className="text-[10px] font-medium text-gray-700 mb-1.5">Legend</h5>
        <div className="grid grid-cols-3 gap-1.5 text-[9px]">
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-1.5 bg-red-100 border border-red-300 rounded-full" />
            <span className="text-gray-600">Leave</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-1.5 bg-blue-50 border border-blue-200 rounded" />
            <span className="text-gray-600">Weekend</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span className="text-gray-600">Start</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span className="text-gray-600">End</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-gray-600">Approval</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />
            <span className="text-gray-600">Created</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-1.5 bg-amber-50 border border-amber-200 rounded" />
            <span className="text-gray-600">National</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-1.5 bg-green-50 border border-green-200 rounded" />
            <span className="text-gray-600">Festival</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <div className="w-3 h-1.5 bg-purple-50 border border-purple-200 rounded" />
            <span className="text-gray-600">Public</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarWidget;
