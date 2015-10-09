import os
import jinja2
import webapp2
import tweepy
import json
import sys
import re
import time

JINJA_ENVIRONMENT = jinja2.Environment(
    loader=jinja2.FileSystemLoader(os.path.dirname(__file__)),
    extensions=['jinja2.ext.autoescape'])

#***************************************************************************************
#            Create the API for getting tweets
#***************************************************************************************

CONSUMER_KEY = '' # consumer key for twitter api
CONSUMER_SECRET = '' # consumer secret for twitter api
ACCESS_TOKEN_KEY = "" # ccess token key for twitter api
ACCESS_TOKEN_SECRET = "" # access token secret for twitter api

auth = tweepy.OAuthHandler(CONSUMER_KEY, CONSUMER_SECRET)
auth.set_access_token(ACCESS_TOKEN_KEY, ACCESS_TOKEN_SECRET)
api = tweepy.API(auth)


class CustomStreamListener(tweepy.StreamListener):

    pagination_mode = 'cursor'

    def on_data(self, raw_data):
        data = json.loads(raw_data)
        if 'in_reply_to_status_id' in data:
            status = Status.parse(self.api, data)
            if self.on_status(status) is False:
                return False
        elif 'delete' in data:
            delete = data['delete']['status']
            if self.on_delete(delete['id'], delete['user_id']) is False:
                return False
        elif 'limit' in data:
            if self.on_limit(data['limit']['track']) is False:
                return False
        elif 'disconnect' in data:
            if self.on_disconnect(data['disconnect']) is False:
                return False
        else:
            logging.error("Unknown message type: " + str(raw_data))

    def on_status(self, status):
        try:
            if (status.geo != None):
                print jason.dumps(status.author.screen_name)#.encode("utf8")
                print status.text.encode("utf8")
                print status.created_at
                print status.geo['coordinates']
        except Exception, e:
            print >> sys.stderr, 'Encountered Exception:', e
            pass

    def on_connect(self):
        print >> sys.stderr, 'Successfully connected'

    def on_error(self, status_code):
        print >> sys.stderr, 'Encountered error with status code:', status_code
        return True # Don't kill the stream

    def on_timeout(self):
        print >> sys.stderr, 'Timeout...'
        return True # Don't kill the stream

streaming_api = tweepy.streaming.Stream(auth, CustomStreamListener(), timeout = 60)

#****************************************************************************************************************
#            Analysis of sentiment of tweets
#****************************************************************************************************************

def get_sentiment_lib():
    sent_file = open("res/sentiment.txt")
    scores = {} # initialize an empty dictionary
    for line in sent_file:
            term, score  = line.split("\t")  # The file is tab-delimited. "\t" means "tab character"
            scores[term] = int(score)  # Convert the score to an integer.
    return scores

def tweet_to_terms(text):            
    s = re.findall("\w+",str.lower(json.dumps(text)))#extract the words, and change to lower case
    l = sorted(list(set(s)))#remove the repeating ones, and list them
    tweetlist=[]
    for i in l:#remove those including digits or symbols
            m = re.search("\d+",i)
            n = re.search("\W+",i)
            if not m and  not n:
                    tweetlist.append(i)
    return tweetlist

def calc_termsent(sentlib,termlist):
    count = 0
    result = 0.0
    for j in range(len(termlist)):
        if termlist[j] in sentlib.keys():
            result += float(sentlib[termlist[j]])
            count += 1
    if count != 0:
        result /= count
    return result   

sent_lib = get_sentiment_lib()
#**********************************************************************************************************************
#            MainPage handler
#**********************************************************************************************************************

class MainPage(webapp2.RequestHandler):   

    def get(self):
        template = JINJA_ENVIRONMENT.get_template('index.html')
        template_values = {
        }
        outstr = template.render(template_values)
        self.response.out.write(outstr)

    def post(self): 
        buttonid = self.request.get("buttonid")
        pos_lati = float(self.request.get("pos_lati"))
        pos_longi = float(self.request.get("pos_longi"))

        if(buttonid == "gettweets"):
            max_count = int(self.request.get("tweet_num"))
            keyword = self.request.get("keyword") 
            if (max_count!= '' and keyword != ''):

    #            pos_lati = float(self.request.get('pos_lati'))
    #            pos_longi = float(self.request.get('pos_longi'))
    #            southwest_lati = pos_lati - 0.08
    #            southwest_longi = pos_longi - 0.15
    #            northeast_lati = pos_lati + 0.08
    #            northeast_longi = pos_longi + 0.15

                count = 0
                tweets = []
                status_id = []
                start_time = time.time() + max_count*5
                search_status = 0 # means no time out
                while (count < max_count):
                    if (time.time() > start_time): 
                        search_status = 1 # means time-out occurred
                        break
                    search_tweet = tweepy.Cursor(api.search, q = keyword, rpp = 100, result_type = "recent", lang="en", include_entities = 'true')#, geocode = "40.697299,-74.005623, 20000km");
                    #search_tweet = tweepy.Cursor(streaming_api.filter,follow = None, track = None).pages();
                    #search_tweet = api.search(q = keyword, result_type = "recent", count = 100, lang = 'en')#, geocode = "40.697299,-74.005623, 200km")
                    #search_tweet = streaming_api.sample()             
                    #search_tweet = streaming_api.filter(follow = None, track = ['I'], locations = [0.0, -90.0, 89.0, -45.0])
                    for status in search_tweet.items():
                        if (status.geo != None and (status.id not in status_id)):
                            #print "***********************************************************************"
                            #print status.author.screen_name.encode("utf8")
                            #print status.text.encode("utf8")
                            #print status.created_at
                            #print status.geo['coordinates']
                            #print status.entities["urls"]

                            term_list = tweet_to_terms(status.text)
                            sentiment = calc_termsent(sent_lib,term_list)
                            if (status.created_at.hour < 7):                           
                                tweet = {'status': '<IMG BORDER="0" ALIGN="Left" SRC="'+ status.author.profile_image_url_https+ '">'+
                                                str(status.created_at.year)+'-'+
                                                str(status.created_at.month)+'-'+ str(status.created_at.day - 1)+' '+
                                                str(status.created_at.hour + 24 - 7)+':'+str(status.created_at.minute)+':'+
                                                str(status.created_at.second) + ' @' +
                                                status.author.screen_name + '</a>:<br><b>'+ 
                                                status.text + "</b>",
                                         'geo': [status.geo['coordinates'][0],status.geo['coordinates'][1]],
                                         'source':status.source_url,
                                         'sentiment':sentiment,

                                        }
                                tweets.append(tweet)
                            else:
                                tweet = {'status':  '<IMG BORDER="0" ALIGN="Left" SRC="'+ status.author.profile_image_url_https+ '">'+
                                                str(status.created_at.year)+'-'+
                                                str(status.created_at.month)+'-'+ str(status.created_at.day)+' '+
                                                str(status.created_at.hour - 7)+':'+str(status.created_at.minute)+':'+
                                                str(status.created_at.second) + ' @' +
                                                status.author.screen_name + '</a>:<br><b>'+ 
                                                status.text + "</b>",
                                         'geo': [status.geo['coordinates'][0],status.geo['coordinates'][1]],
                                         'source':status.source_url,
                                         'sentiment':sentiment
                                        }
                                tweets.append(tweet)       
                            status_id.append(status.id)
                            count = count + 1
                            if (count >= max_count): break

                #streaming_api.sample()
                #streaming_api.filter(follow = None, track = ['twitter'], locations = [0.0, -90.0, 89.0, -45.0])
                self.response.out.headers['Content-Type']= 'text/json'
                data = {
                    'tweets': tweets,
                    'search_status':search_status,
                    'count':count
                }
                self.response.out.write(json.dumps(data))
                return
        if(buttonid == "gettrends"):
            woeid = api.trends_closest(pos_lati, pos_longi)[0]["woeid"]
            trends_list = api.trends_place(id = woeid)[0]["trends"]
            content = ''
            for trend in trends_list:
                topic = trend["name"]
                topic_url = trend["url"]
                content += '<li><a href="' + topic_url + '"target="_blank">'+ topic +'</a>'
            self.response.out.headers['Content-Type']= 'text/json'
            data = {
                'content': content
            }
            self.response.out.write(json.dumps(data))
            return

        template = JINJA_ENVIRONMENT.get_template('main.html')
        template_values = {
        }
        outstr = template.render(template_values)
        self.response.out.write(outstr)


application = webapp2.WSGIApplication([
    ('/', MainPage),
], debug=True)
