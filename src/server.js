import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import crypto from 'crypto';

import connectDB from './config/database.js';
// import secondDB from './config/webDb.js';
import { errorHandler, notFound } from './middleware/errorMiddleware.js';
import { socketAuth } from './middleware/socketMiddleware.js';

import chatController from "./controllers/chatController.js"


import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import pageRoutes from './routes/pagesRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import entityRoutes from './routes/entitiesRoutes.js';
import categoryRoutes from './routes/categoriesRoutes.js';
import moduleRoutes from './routes/modulesRoutes.js';
import contentRoutes from './routes/contentRoutes.js';
// import tokenRoutes from './routes/tokenRoutes.js'
import vimeoRoutes from './routes/vimeoRoutes.js';
import promoRoutes from './routes/promoRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import leadRoutes from './routes/leadRoutes.js'
import testRoutes from './routes/testRoutes.js';
import webRoutes from './routes/webRoutes.js';
import aiRoutes from './services/speakingService.js'
import supportRoutes from './routes/supportRoutes.js';
import mcuRoutes from './routes/mcuRoutes.js';

import paymentRoutes from './routes/paymentRoutes.js';

import { runManualCheck, setupWalletCronJob } from './cronJob/cronJobs.js';
import "./cronJob/leadAutoAssign.js"

import { Question } from './models/GGSschema/questionSchema.js';

// setupWalletCronJob();

dotenv.config();
connectDB();

const app = express();
const server = createServer(app);
app.use("/uploads", express.static("uploads"));

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  },
  credentials: true
});

io.use(socketAuth);

app.use(helmet());

const allowedOrigins = [
  "https://www.gatewayabroadeducations.com",
  "https://uat.gatewayabroadeducations.com",
  "https://join.gatewayabroadeducations.com",
  "https://portal.gatewayabroadeducations.com",
  "https://gatewayabroadeducations.com",
  "https://dashboard.gatewayabroadeducations.com",
  "https://m8j3lq9z-5173.inc1.devtunnels.ms",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8000",
  "http://localhost:5173",
  "https://6dtmqkkr-5173.inc1.devtunnels.ms",
  "https://portal-virid-eta.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(cookieParser());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/categories', categoryRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use('/api/v1/page', pageRoutes);
app.use('/api/v1/entities', entityRoutes);
app.use('/api/v1/content', contentRoutes);
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/promo-codes', promoRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/purchase', purchaseRoutes);
app.use('/api/v1/leads', leadRoutes)
app.use('/api/v1/live', vimeoRoutes);
app.use('/api/v1/test', testRoutes);
app.use('/api/v1/web', webRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/mcu', mcuRoutes);
app.use('/api', aiRoutes);

let questions = [
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "The proposal above relies on which of the following assumptions?",
    "stimulus": "The rate of new drug development in Nation X has changed little over the last decade, even though, over the same period, the cost of developing a new drug has increased significantly. The patent system in Nation X, because it insulates drug developers from various market pressures, can be expected to produce this sort of cost explosion. Such patent protection allows firms to sell a drug at several times its free-market price for many years, and thus pharmaceutical companies have no incentive to minimize research costs. Greatly limiting the duration of these patent protections would promote more cost-efficient new drug development.",
    "options": [
      { "label": "A", "text": "In Nation X, current patent protections create impediments to the development of new drugs.", "isCorrect": false },
      { "label": "B", "text": "If the prices of newly developed drugs were subject to market pressures sooner, companies would have a greater incentive to minimize research costs.", "isCorrect": true },
      { "label": "C", "text": "If the prices of newly developed drugs were subject to market pressures sooner, pharmaceutical companies would have a greater incentive to increase the number of drugs they develop.", "isCorrect": false },
      { "label": "D", "text": "Nation X's current patent system causes some pharmaceutical companies to exaggerate their research costs to consumers.", "isCorrect": false },
      { "label": "E", "text": "If the prices of newly developed drugs were subject to market pressures sooner, pharmaceutical companies would have a greater incentive to develop the most medically necessary new drugs.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "The reasoning above relies on which of the following assumptions?",
    "stimulus": "According to results from brain scans, the insula—a brain area associated in part with pain—exhibits heightened activity when consumers think about how much a purchase will cost. In a recent study, researchers auctioned off tickets to a sold-out event. Half the study participants were to use cash to buy the tickets, while the other half were to pay by credit card. The credit card buyers bid, on average, twice as much as the cash buyers bid. This shows that credit cards, because they involve paying later, limit consumers' thoughts about price: credit card users are willing to spend more money because they experience less pain.",
    "options": [
      { "label": "A", "text": "In the study, the participants did not generally prefer to pay for tickets with a check drawn from a bank.", "isCorrect": false },
      { "label": "B", "text": "Most people exhibit similar levels of insula activity when thinking about a product's price.", "isCorrect": false },
      { "label": "C", "text": "In the study, the credit card buyers were not, on average, significantly more interested in attending the event than the cash buyers were.", "isCorrect": true },
      { "label": "D", "text": "Consumers cannot control the amount of time they spend thinking about an item's price.", "isCorrect": false },
      { "label": "E", "text": "In general, consumers do not consider an item's price before deciding on a payment method.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Which of the following, if true, would most strengthen the argument?",
    "stimulus": "Folic acid is a nutrient present in leafy vegetables and some other foods. In the blood, folic acid inhibits the formation of substances found in arterial blockages that commonly cause heart attacks. Moreover, in a long-term study of 10,000 individuals, the subgroup with the highest blood levels of folic acid had fewer heart attacks than the subgroup with the lowest levels. Therefore, a decrease in dietary folic acid will increase the risk of a heart attack.",
    "options": [
      { "label": "A", "text": "Many of the people who had heart attacks during the study were eating a high-fat diet, which is known to contribute to the formation of arterial blockages.", "isCorrect": false },
      { "label": "B", "text": "Folic acid cannot be synthesized or stored by the body.", "isCorrect": true },
      { "label": "C", "text": "Arterial blockages usually take years to develop.", "isCorrect": false },
      { "label": "D", "text": "The group that had the fewest heart attacks also had the best exercise habits.", "isCorrect": false },
      { "label": "E", "text": "The subjects in the study were tested for folic acid levels most frequently in the first two years of the study.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "The author of the passage would be most likely to agree with which of the following statements about consumers' knowledge of retail pricing strategies?",
    "stimulus": "A primary concern among manufacturers polled in a 1998 survey was the inefficiency of trade promotions—inducements offered by manufacturers to retailers to encourage them to reduce retail prices temporarily so as to boost sales volume. Such inducements may include temporarily reduced costs of goods, free goods, or display allowances (fees manufacturers pay retailers to encourage them to allocate premium shelf space to a product). At the heart of manufacturers' dissatisfaction lies concern regarding widespread retailer opportunism. Although consumers know from experience the approximate frequency of promotional pricing, they do not typically have complete information about ongoing trade promotions in a given period, so retailers can profit by sometimes choosing not to pass along their own savings to their customers. Inefficient use of trade promotion dollars has prompted several large manufacturers to adopt an 'everyday low price' policy for their goods, but at least one diaper manufacturer found it had to revert to its former pricing strategies in the face of increasing promotional competition from other brands. Adopting an alternative approach, some manufacturers have themselves advertised ongoing promotions. By informing at least some customers about promotions, manufacturers believe they can regulate retailer opportunism by increasing customers' propensity to search for discounted prices.",
    "options": [
      { "label": "A", "text": "Consumers believe that retailers do not have the option to charge full price for items that manufacturers tell them to discount.", "isCorrect": false },
      { "label": "B", "text": "Consumers assume that a retailer who offers discounts on some items will inflate the prices of other items to compensate for it.", "isCorrect": false },
      { "label": "C", "text": "Consumers are aware that they can expect to find familiar brands available at discounted prices at fairly predictable intervals.", "isCorrect": true },
      { "label": "D", "text": "Consumers believe that retailers must pay the same price for goods whether or not they offer them at a discount to customers.", "isCorrect": false },
      { "label": "E", "text": "Consumers often do not realize that price discounts typically originate from manufacturers rather than individual retailers.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "It can be inferred that the diaper manufacturer mentioned in the highlighted text of the passage discovered that consumers",
    "stimulus": "A primary concern among manufacturers polled in a 1998 survey was the inefficiency of trade promotions—inducements offered by manufacturers to retailers to encourage them to reduce retail prices temporarily so as to boost sales volume. Such inducements may include temporarily reduced costs of goods, free goods, or display allowances (fees manufacturers pay retailers to encourage them to allocate premium shelf space to a product). At the heart of manufacturers' dissatisfaction lies concern regarding widespread retailer opportunism. Although consumers know from experience the approximate frequency of promotional pricing, they do not typically have complete information about ongoing trade promotions in a given period, so retailers can profit by sometimes choosing not to pass along their own savings to their customers. Inefficient use of trade promotion dollars has prompted several large manufacturers to adopt an 'everyday low price' policy for their goods, but at least one diaper manufacturer found it had to revert to its former pricing strategies in the face of increasing promotional competition from other brands. Adopting an alternative approach, some manufacturers have themselves advertised ongoing promotions. By informing at least some customers about promotions, manufacturers believe they can regulate retailer opportunism by increasing customers' propensity to search for discounted prices.",
    "options": [
      { "label": "A", "text": "were unlikely to continue to purchase a brand that had a lower regular price in the face of temporary discounts on diapers of other brands", "isCorrect": true },
      { "label": "B", "text": "tended to equate higher prices on diapers with higher quality, and so were willing to pay full price for expensive brands", "isCorrect": false },
      { "label": "C", "text": "usually became loyal to a particular brand of diaper and would purchase that brand whether or not it was on sale", "isCorrect": false },
      { "label": "D", "text": "bought fewer diapers per shopping trip when they knew the diapers would always be available at the same 'everyday low price'", "isCorrect": false },
      { "label": "E", "text": "were more willing to search for discounted prices on diapers than for other products typically available in the same stores", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "According to the passage, some manufacturers have attempted to counteract retailer opportunism by",
    "stimulus": "A primary concern among manufacturers polled in a 1998 survey was the inefficiency of trade promotions—inducements offered by manufacturers to retailers to encourage them to reduce retail prices temporarily so as to boost sales volume. Such inducements may include temporarily reduced costs of goods, free goods, or display allowances (fees manufacturers pay retailers to encourage them to allocate premium shelf space to a product). At the heart of manufacturers' dissatisfaction lies concern regarding widespread retailer opportunism. Although consumers know from experience the approximate frequency of promotional pricing, they do not typically have complete information about ongoing trade promotions in a given period, so retailers can profit by sometimes choosing not to pass along their own savings to their customers. Inefficient use of trade promotion dollars has prompted several large manufacturers to adopt an 'everyday low price' policy for their goods, but at least one diaper manufacturer found it had to revert to its former pricing strategies in the face of increasing promotional competition from other brands. Adopting an alternative approach, some manufacturers have themselves advertised ongoing promotions. By informing at least some customers about promotions, manufacturers believe they can regulate retailer opportunism by increasing customers' propensity to search for discounted prices.",
    "options": [
      { "label": "A", "text": "selling goods to retailers at reduced prices", "isCorrect": false },
      { "label": "B", "text": "offering more frequent but less potentially lucrative promotions", "isCorrect": false },
      { "label": "C", "text": "alerting consumers when promotions are happening", "isCorrect": true },
      { "label": "D", "text": "offering certain goods to retailers at no charge", "isCorrect": false },
      { "label": "E", "text": "paying retailers fees to prominently display certain goods", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Which of the following, if true, most strengthens the argument?",
    "stimulus": "In the past decade, floods along certain coastal regions of the United States caused by severe storms resulted in extraordinary property damage and unprecedented costs for property owners and insurance companies. Meteorologists predict that the number of such storms will increase significantly during the next decade. Therefore, property damage caused by coastal storms is likely to cost property owners and insurance companies significantly more money in the next decade than in the past decade.",
    "options": [
      { "label": "A", "text": "Severe storms that cause flooding in the coastal regions usually occur in the springtime.", "isCorrect": false },
      { "label": "B", "text": "Regional economic trends are attracting increasing numbers of people into these coastal regions.", "isCorrect": true },
      { "label": "C", "text": "Although storms are likely to increase in frequency over the next decade, the severity of storms is not expected to increase.", "isCorrect": false },
      { "label": "D", "text": "In areas where flooding was the worst, property owners chose to move rather than rebuild in the same location.", "isCorrect": false },
      { "label": "E", "text": "Building codes in many coastal communities have increased the required distance between the shoreline and newly constructed residences.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "The passage suggests that the scientists mentioned in the first highlighted portion of text differ from the scientists mentioned in the second highlighted portion of text in that the former",
    "stimulus": "Research directed toward recovering ancient DNA began in 1984, when pieces of DNA were extracted from museum specimens of an animal extinct for about a century. Most such genetic material recovered from biological relics consists of tiny fragments, rather than the strings of thousands of molecules typically found in living organisms, but these fragments may contain sufficient information to identify a species through comparison with modern DNA from descendant species. However, the need to verify whether particular fragments actually come from ancient organisms or whether they come from modern contaminants, such as the sweat of people who have handled the specimens, is crucial. For example, some scientists claim to have extracted DNA fragments from 17-million-year-old magnolia leaves found in an unusual fossil deposit in Idaho. But other scientists suggest that this DNA is a modern contaminant; they argue that even under the most favorable conditions, the rate of degradation of DNA is such that useful genetic material could not be recovered from fossils that old and that since the leaves were trapped in wet deposits, it is particularly unlikely that any DNA would have survived so long. A solution to this debate lies in the fact that any ancient DNA should differ from that of related modern species. If the DNA extracted from the fossil leaves were actually a modern contaminant, this fact would be apparent from the information contained in the DNA.",
    "options": [
      { "label": "A", "text": "assume a higher rate of degradation of DNA in fossil material", "isCorrect": false },
      { "label": "B", "text": "argue that the conditions of the Idaho fossil deposit were exceptional", "isCorrect": false },
      { "label": "C", "text": "have different techniques for extracting genetic material from a specimen that is 17 million years old", "isCorrect": false },
      { "label": "D", "text": "have devised a method for identifying modern contaminants found in biological relics", "isCorrect": false },
      { "label": "E", "text": "believe that fragments of DNA could survive in fossils for 17 million years", "isCorrect": true }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "The passage is primarily concerned with",
    "stimulus": "Research directed toward recovering ancient DNA began in 1984, when pieces of DNA were extracted from museum specimens of an animal extinct for about a century. Most such genetic material recovered from biological relics consists of tiny fragments, rather than the strings of thousands of molecules typically found in living organisms, but these fragments may contain sufficient information to identify a species through comparison with modern DNA from descendant species. However, the need to verify whether particular fragments actually come from ancient organisms or whether they come from modern contaminants, such as the sweat of people who have handled the specimens, is crucial. For example, some scientists claim to have extracted DNA fragments from 17-million-year-old magnolia leaves found in an unusual fossil deposit in Idaho. But other scientists suggest that this DNA is a modern contaminant; they argue that even under the most favorable conditions, the rate of degradation of DNA is such that useful genetic material could not be recovered from fossils that old and that since the leaves were trapped in wet deposits, it is particularly unlikely that any DNA would have survived so long. A solution to this debate lies in the fact that any ancient DNA should differ from that of related modern species. If the DNA extracted from the fossil leaves were actually a modern contaminant, this fact would be apparent from the information contained in the DNA.",
    "options": [
      { "label": "A", "text": "questioning the applicability of a particular methodology", "isCorrect": false },
      { "label": "B", "text": "identifying issues central to correctly dating DNA fragments", "isCorrect": false },
      { "label": "C", "text": "presenting evidence to undermine a theory about the age of certain biological relics", "isCorrect": false },
      { "label": "D", "text": "describing two methods commonly used to date certain biological relics", "isCorrect": false },
      { "label": "E", "text": "presenting several possible explanations for the survival of DNA in biological relics", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "Which of the following statements, if true, would most clearly undermine the usefulness of the author's solution to the scientists' debate that is discussed in the passage?",
    "stimulus": "Research directed toward recovering ancient DNA began in 1984, when pieces of DNA were extracted from museum specimens of an animal extinct for about a century. Most such genetic material recovered from biological relics consists of tiny fragments, rather than the strings of thousands of molecules typically found in living organisms, but these fragments may contain sufficient information to identify a species through comparison with modern DNA from descendant species. However, the need to verify whether particular fragments actually come from ancient organisms or whether they come from modern contaminants, such as the sweat of people who have handled the specimens, is crucial. For example, some scientists claim to have extracted DNA fragments from 17-million-year-old magnolia leaves found in an unusual fossil deposit in Idaho. But other scientists suggest that this DNA is a modern contaminant; they argue that even under the most favorable conditions, the rate of degradation of DNA is such that useful genetic material could not be recovered from fossils that old and that since the leaves were trapped in wet deposits, it is particularly unlikely that any DNA would have survived so long. A solution to this debate lies in the fact that any ancient DNA should differ from that of related modern species. If the DNA extracted from the fossil leaves were actually a modern contaminant, this fact would be apparent from the information contained in the DNA.",
    "options": [
      { "label": "A", "text": "DNA extracted from ancient specimens is not identical to the DNA of related modern species.", "isCorrect": false },
      { "label": "B", "text": "Most ancient biological relics are not preserved under favorable conditions.", "isCorrect": false },
      { "label": "C", "text": "Only tiny fragments of genetic material can be recovered from ancient biological relics.", "isCorrect": false },
      { "label": "D", "text": "There are many segments of DNA that show very little change between ancient and modern DNA.", "isCorrect": true },
      { "label": "E", "text": "Careless handling of biological relics is an ongoing problem in attempts to extract ancient DNA from fossils.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "The passage is primarily concerned with",
    "stimulus": "Atmospheric carbon dioxide (CO2) has been increasing since 1700, but the amount of CO2 produced in that time by burning fossil fuels should have resulted in a much greater increase than has been observed. Plant ecologist Allen Auclair claims that the woodlands of the Northern Hemisphere have been acting as a carbon sink, absorbing carbon from the atmosphere and turning it into wood. Auclair uses measurements of factors affecting the area and density of a forest—such as logging, fires, and pests—and estimates of tree growth rates to argue that increases in the growth rates of individual trees in these forests since 1920 have created a large volume of wood that accounts for the missing carbon.",
    "options": [
      { "label": "A", "text": "refuting a claim about the causes of a phenomenon", "isCorrect": false },
      { "label": "B", "text": "presenting an analysis of a common natural process", "isCorrect": false },
      { "label": "C", "text": "providing an explanation for a puzzling phenomenon", "isCorrect": true },
      { "label": "D", "text": "evaluating the methodology used in a recent study", "isCorrect": false },
      { "label": "E", "text": "contrasting two explanations of an unexpected phenomenon", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "It can be inferred from the passage that the northern woodlands would be more likely to function as a carbon source if which of the following were to occur?",
    "stimulus": "Atmospheric carbon dioxide (CO2) has been increasing since 1700, but the amount of CO2 produced in that time by burning fossil fuels should have resulted in a much greater increase than has been observed. Plant ecologist Allen Auclair claims that the woodlands of the Northern Hemisphere have been acting as a carbon sink, absorbing carbon from the atmosphere and turning it into wood. Auclair uses measurements of factors affecting the area and density of a forest—such as logging, fires, and pests—and estimates of tree growth rates to argue that increases in the growth rates of individual trees in these forests since 1920 have created a large volume of wood that accounts for the missing carbon. To determine whether the woodlands as a whole are releasing or absorbing carbon, the volume of wood added to the woodlands must be compared with the wood lost. Auclair's analysis of the past hundred years shows the woodlands changing from a carbon source to a carbon sink. Before 1890, northern woodlands were a source of CO2 mainly because of forest fires and logging. Such deforestation releases CO2 because debris from the forest floor rots more quickly when the trees are cleared. After 1920, the steep increase in tree growth rates surpassed the losses stemming from fire and logging, turning the northern forests from a carbon source into a carbon sink and storing CO2 from fossil fuel over the next fifty years.",
    "options": [
      { "label": "A", "text": "Vegetation regrowing on land from which trees had been cleared grew back fast enough to absorb as much CO2 as was released by deforestation.", "isCorrect": false },
      { "label": "B", "text": "Debris from the forest floor rotted less quickly after the rate of tree growth increased.", "isCorrect": false },
      { "label": "C", "text": "A significant increase in the number of pests that destroy trees caused an increase in tree loss.", "isCorrect": true },
      { "label": "D", "text": "Pollution resulting from burning fossil fuels provided trees with extra nutrients, thus increasing the rate of their growth.", "isCorrect": false },
      { "label": "E", "text": "A decrease in temperature caused a significant decrease in the number of fires in the northern woodlands.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "It can be inferred from the passage that Auclair's claim about carbon and the northern woodlands would be most seriously undermined if which of the following were true?",
    "stimulus": "Atmospheric carbon dioxide (CO2) has been increasing since 1700, but the amount of CO2 produced in that time by burning fossil fuels should have resulted in a much greater increase than has been observed. Plant ecologist Allen Auclair claims that the woodlands of the Northern Hemisphere have been acting as a carbon sink, absorbing carbon from the atmosphere and turning it into wood. Auclair uses measurements of factors affecting the area and density of a forest—such as logging, fires, and pests—and estimates of tree growth rates to argue that increases in the growth rates of individual trees in these forests since 1920 have created a large volume of wood that accounts for the missing carbon. To determine whether the woodlands as a whole are releasing or absorbing carbon, the volume of wood added to the woodlands must be compared with the wood lost. Auclair's analysis of the past hundred years shows the woodlands changing from a carbon source to a carbon sink. Before 1890, northern woodlands were a source of CO2 mainly because of forest fires and logging. Such deforestation releases CO2 because debris from the forest floor rots more quickly when the trees are cleared. After 1920, the steep increase in tree growth rates surpassed the losses stemming from fire and logging, turning the northern forests from a carbon source into a carbon sink and storing CO2 from fossil fuel over the next fifty years.",
    "options": [
      { "label": "A", "text": "The northern woodlands functioned as a carbon source rather than as a carbon sink prior to 1890.", "isCorrect": false },
      { "label": "B", "text": "The rate of tree growth in the northern woodlands increased throughout the twentieth century.", "isCorrect": false },
      { "label": "C", "text": "The northern woodlands absorbed larger amounts of carbon after 1920 than they had in previous years.", "isCorrect": false },
      { "label": "D", "text": "During the twentieth century, the total volumes of wood lost to rot or fire in the northern woodlands exceeded increases in wood volume.", "isCorrect": true },
      { "label": "E", "text": "The northern woodlands lost trees to forest fires and logging in the early twentieth century.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Graciela's argument depends on the assumption that",
    "stimulus": "Premila: Everybody who works with your quality-assurance process has thoroughly internalized all aspects of it, but we also need a written explanation of every step in the process, just in case someone else has to apply the process. Graciela: I agree. However, we don't need to spend any time documenting it, because we already have the procedures manual used by the Internal Programs department. All the steps in our process are the same as in the quality-assurance process used by Internal Programs.",
    "options": [
      { "label": "A", "text": "at least some people who currently work with Graciela's quality-assurance process have not thoroughly internalized all aspects of the process", "isCorrect": false },
      { "label": "B", "text": "all steps in the quality-assurance process used by the Internal Programs department are explained in the procedures manual used by that department", "isCorrect": true },
      { "label": "C", "text": "at least some of the steps described in the procedures manual used by the Internal Programs department are likely to be modified in the near future", "isCorrect": false },
      { "label": "D", "text": "everyone who has thoroughly internalized all aspects of Graciela's quality-assurance process has done so as a result of reading the Internal Programs department's procedures manual", "isCorrect": false },
      { "label": "E", "text": "if everyone who works with the Internal Programs department's quality-assurance process had thoroughly internalized the process, Internal Programs would not have developed a procedures manual", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Which of the following is an assumption on which the argument depends?",
    "stimulus": "After large numbers of honeybees in Zaronia were found dead, evidence pointed to the possibility that the bees were sickened by the fungicide Voxper, which had recently been introduced into areas where many of the bees had hives. The government banned the use of Voxper, which was no longer used in Zaronia during the three years following the ban. But after three years, bee populations had not recovered and bees were still dying. It can be concluded that Voxper was not in fact the cause of the bees' death.",
    "options": [
      { "label": "A", "text": "Honeybees had lived in the affected areas of Zaronia for many years before Voxper was applied.", "isCorrect": false },
      { "label": "B", "text": "Voxper was found to have adverse effects on insects other than honeybees.", "isCorrect": false },
      { "label": "C", "text": "The environmental effects of Voxper are unlikely to have persisted for three years following its most recent use.", "isCorrect": true },
      { "label": "D", "text": "The government ban on Voxper was in force only in areas containing large concentrations of bees.", "isCorrect": false },
      { "label": "E", "text": "Honey and wax production was essentially unchanged in areas where Voxper was not applied.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Which of the following most logically completes the passage?",
    "stimulus": "Journalist: More and more people are being diagnosed with thyroid cancer. Many doctors have long believed that this is solely due to unnecessary testing that finds small tumors that do not lead to complications. However, while greater awareness of this cancer, especially its tendency to strike younger women, has indeed prompted more-frequent testing, overtesting is not really the culprit, because",
    "options": [
      { "label": "A", "text": "exposure to certain chemicals appears to be associated with thyroid cancer", "isCorrect": false },
      { "label": "B", "text": "patients do not usually have symptoms unless the cancer is at an advanced stage", "isCorrect": false },
      { "label": "C", "text": "the accuracy of diagnostic tests for thyroid cancer has not increased significantly", "isCorrect": false },
      { "label": "D", "text": "the survival rate for thyroid cancer is higher than it is for most other cancers", "isCorrect": false },
      { "label": "E", "text": "thyroid tumors of all sizes are increasing significantly in number", "isCorrect": true }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "The information in the passage suggests that Susan Reverby would be most likely to DISAGREE with which of the following statements about nursing education?",
    "stimulus": "According to Susan Reverby's Ordered to Care, the most salient fact about the occupation of nursing has been its traditional conceptualization by both the public and medical professionals as women's work, a judgment that has had a dramatic impact both on the nature of the tasks nurses perform and on the status of the profession. Reverby demonstrates how this ideology of nursing grew, not out of a belief in women's rights but from eighteenth- and nineteenth-century understandings of womanly character and duty. Before 1870, nursing took place either in the home, where women nursed their loved ones as part of their familial obligations or in hospitals, which were custodial institutions for the poor. Despite the differences in the settings, women in each of these roles were assumed to be \"naturals\" for the job, so hospital nurses were paid wages whose meagerness suggested money's irrelevance to the true character of nursing. Even after 1870, when scientific and medical advances hastened the development of nursing as skilled paid labor, the ideology concerning nursing changed very little. True, leaders in nursing education advocated professionalism: being a woman was necessary, but not sufficient, for nursing. They envisioned the establishment of strict training schools, controlled by women, to teach the elements of health care that were no longer attended to by the rapidly specializing physician. They were pleased to be aided in their efforts by hospital administrators and doctors, who understood that the movement to upgrade and standardize nursing education would support their own plans for reforming medicine.",
    "options": [
      { "label": "A", "text": "Nursing education in the nineteenth century dramatically changed the ideology of nursing.", "isCorrect": true },
      { "label": "B", "text": "Nursing education did not significantly affect the professional relationship between nurses and doctors.", "isCorrect": false },
      { "label": "C", "text": "Hospital exigencies limited the autonomy of nurses in relation to doctors.", "isCorrect": false },
      { "label": "D", "text": "Hospital administrators hoped that standardized nursing education would promote their own goals.", "isCorrect": false },
      { "label": "E", "text": "Prior to 1870, there was no formal education for nurses because women were assumed to be naturally capable of the work.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "According to the passage, the ideology of nursing has determined",
    "stimulus": "According to Susan Reverby's Ordered to Care, the most salient fact about the occupation of nursing has been its traditional conceptualization by both the public and medical professionals as women's work, a judgment that has had a dramatic impact both on the nature of the tasks nurses perform and on the status of the profession. Reverby demonstrates how this ideology of nursing grew, not out of a belief in women's rights but from eighteenth- and nineteenth-century understandings of womanly character and duty.",
    "options": [
      { "label": "A", "text": "the settings in which nursing actually occurs", "isCorrect": false },
      { "label": "B", "text": "twentieth-century notions of female character and duty", "isCorrect": false },
      { "label": "C", "text": "the status of the nursing profession", "isCorrect": true },
      { "label": "D", "text": "the goals of doctors and hospital administrators", "isCorrect": false },
      { "label": "E", "text": "the role of women in different branches of medicine", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "The word \"naturals\" (see highlighted text) is used primarily in order to",
    "stimulus": "Before 1870, nursing took place either in the home, where women nursed their loved ones as part of their familial obligations or in hospitals, which were custodial institutions for the poor. Despite the differences in the settings, women in each of these roles were assumed to be \"naturals\" for the job, so hospital nurses were paid wages whose meagerness suggested money's irrelevance to the true character of nursing.",
    "options": [
      { "label": "A", "text": "suggest Susan Reverby's view of the appropriateness of women for the occupation of nursing", "isCorrect": false },
      { "label": "B", "text": "point to the irrelevance of women's rights for nurses", "isCorrect": false },
      { "label": "C", "text": "explain the interest of eighteenth- and nineteenth-century women in nursing as a profession", "isCorrect": false },
      { "label": "D", "text": "differentiate the role of women as nurses in the home from the role of women as nurses in hospitals", "isCorrect": false },
      { "label": "E", "text": "emphasize the importance for nursing ideology of eighteenth- and nineteenth-century notions of womanly character and duty", "isCorrect": true }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_rc",
    "difficulty": "Medium",
    "questionText": "Which of the following best states the central idea of the passage?",
    "stimulus": "According to Susan Reverby's Ordered to Care, the most salient fact about the occupation of nursing has been its traditional conceptualization by both the public and medical professionals as women's work, a judgment that has had a dramatic impact both on the nature of the tasks nurses perform and on the status of the profession. Reverby demonstrates how this ideology of nursing grew, not out of a belief in women's rights but from eighteenth- and nineteenth-century understandings of womanly character and duty. Before 1870, nursing took place either in the home, where women nursed their loved ones as part of their familial obligations or in hospitals, which were custodial institutions for the poor. Despite the differences in the settings, women in each of these roles were assumed to be \"naturals\" for the job, so hospital nurses were paid wages whose meagerness suggested money's irrelevance to the true character of nursing. Even after 1870, when scientific and medical advances hastened the development of nursing as skilled paid labor, the ideology concerning nursing changed very little. True, leaders in nursing education advocated professionalism: being a woman was necessary, but not sufficient, for nursing. They envisioned the establishment of strict training schools, controlled by women, to teach the elements of health care that were no longer attended to by the rapidly specializing physician. They were pleased to be aided in their efforts by hospital administrators and doctors, who understood that the movement to upgrade and standardize nursing education would support their own plans for reforming medicine. But the goals of the three groups, Reverby argues, were radically divergent. Hospital administrators realized that training schools attached to their own institutions could become sources of cheap and malleable labor. Doctors saw nursing education as a way of improving care in the hospital, but they opposed any move to bolster nurses' control of their own labor or to improve their scientific skills, arguing that nurses should remain submissive and nurturing. As hospital exigencies quickly came to dominate the decision-making process in the training schools, nursing educators lost control over admission standards, the quality of education, and the labor of students on the wards.",
    "options": [
      { "label": "A", "text": "The ideology of nursing as a profession has been informed by a commitment to women's rights.", "isCorrect": false },
      { "label": "B", "text": "Conflicts between leaders in nursing education and hospital administrators prevented the professionalization of nursing.", "isCorrect": false },
      { "label": "C", "text": "Traditional ideas about women's work hindered the evolution of the ideology of nursing.", "isCorrect": true },
      { "label": "D", "text": "Doctors did not recognize nurses as professionals because the nursing school curriculum was too general.", "isCorrect": false },
      { "label": "E", "text": "Scientific and medical advances of the late nineteenth century had little effect on the practice of nursing.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Which of the following would be most useful to establish in evaluating the plan's chances for success?",
    "stimulus": "Winter storms in Lakeville cause icy road conditions, which the Department of Public Works alleviates by applying road salt after storms. It takes far less salt to prevent icy conditions by applying salt before a winter storm, however, than it does to melt the ice after the fact. In order to reduce the environmental damage caused by salt on Lakeville's main roads, the department plans to apply salt to those roads whenever a winter storm is predicted.",
    "options": [
      { "label": "A", "text": "How much road salt costs the department", "isCorrect": false },
      { "label": "B", "text": "How frequently winter storms predicted for Lakeville fail to arrive", "isCorrect": true },
      { "label": "C", "text": "What proportion of Lakeville's minor roads are salted after storms", "isCorrect": false },
      { "label": "D", "text": "How often Lakeville experiences winter storms", "isCorrect": false },
      { "label": "E", "text": "What percentage of the accidents that occur as a result of icy conditions on Lakeville's roads occur on minor roads", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Which of the following, if true, most seriously weakens the argument?",
    "stimulus": "There is no surviving recording of the Duke Ellington Orchestra's performance of a piece that Ellington wrote for the orchestra late in his career. Two different bands have recently recorded the piece, each claiming to have made an authentic reproduction of the Ellington Orchestra's performance. One of these two recorded performances, however, is much closer to Ellington's own handwritten score, and must therefore be the more authentic of the two.",
    "options": [
      { "label": "A", "text": "In an attempt to foil plagiarizers, Duke Ellington frequently wrote some parts of his pieces in code, so that the written scores misrepresent what Ellington's orchestra played.", "isCorrect": true },
      { "label": "B", "text": "None of the musicians in either of the two bands had been members of Ellington's orchestra during the period when the piece was part of its repertoire.", "isCorrect": false },
      { "label": "C", "text": "Some of the pieces that were credited as Duke Ellington's compositions when they were recorded or published were actually composed by Duke Ellington's collaborator, Billy Strayhorn.", "isCorrect": false },
      { "label": "D", "text": "The piece is believed to have been recorded by the Duke Ellington Orchestra during a recording session several years after it was written, but the recordings made at this session have been lost.", "isCorrect": false },
      { "label": "E", "text": "A saxophonist who was in Ellington's orchestra at the time the piece was written later formed his own band, which performed the piece in an arrangement that differed from Ellington's handwritten score.", "isCorrect": false }
    ],
    "source": "GMAT Mock Test"
  },
  {
    "exam": "gmat",
    "section": "verbal_reasoning",
    "questionType": "gmat_verbal_cr",
    "difficulty": "Medium",
    "questionText": "Which of the following statements would, if true, most support the consultant's reasoning?",
    "stimulus": "Consultant: In most large organizations, the majority of people who end up in leadership positions are extroverted. These people are likely to actively seek leadership positions and make themselves known when such positions are available. When an organization is looking for internal candidates to fill a leadership position, choosing only from among these extroverted people necessarily excludes many other candidates who, for any number of reasons, do not put themselves forward. Thus, organizations that are recruiting from within for leadership positions can increase the number of potentially strong performers in their candidate pool by actively seeking out candidates from among the introverted people in the organization.",
    "options": [
      { "label": "A", "text": "A greater proportion of qualified candidates for leadership positions are extroverted than are introverted.", "isCorrect": false },
      { "label": "B", "text": "Among people in leadership positions, the proportion who are introverted is approximately equal to the proportion who are extroverted.", "isCorrect": false },
      { "label": "C", "text": "Some qualified candidates who are introverted will actively seek leadership positions when they become available.", "isCorrect": false },
      { "label": "D", "text": "Organizations tend to prefer internal candidates when recruiting for leadership positions.", "isCorrect": false },
      { "label": "E", "text": "On average, extroverted people in leadership positions perform no better than introverted people do.", "isCorrect": true }
    ],
    "source": "GMAT Mock Test"
  }
]

// questions.forEach(async (q) => {
//   // await Question.create(q);
//   const question = await Question.create({
//       exam:"6926e3f58c40c330202b130b",
//       section : "6926e0798c40c330202b12ab",
//       questionType : q.questionType,
//       questionText : q.questionText,
//       options: q.options,
//       correctAnswerText:"",
//       difficulty: q.difficulty,
//       tags:q.tags || [],
//       stimulus:q.stimulus || '',
//       marks:1,
//       negativeMarks:0,
//       explanation: q.explanation || '',
//       source:q.section == "gmat001-2"
//     });
// });


// app.use('/api/v1/tokens', tokenRoutes);
// app.use('/api/v1/notifications', notificationRoutes);
// app.use('/api/v1/analytics', analyticsRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

io.on('connection', (socket) => {
  socket.on('joinClass', (joinData) => {
    chatController.handleJoinClass(socket, io, joinData);
  });

  socket.on('message', chatController.handleMessage(socket, io));

  socket.on('typing', chatController.handleTyping(socket));

  socket.on('adminAction', chatController.handleAdminAction(socket, io));

  socket.on('disconnect', chatController.handleDisconnect(socket, io));
});


app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

export default app;