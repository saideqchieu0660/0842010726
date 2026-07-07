const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

const aiRoutingMiddlewareString = `
  const aiRoutingMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let userId = req.headers["x-user-id"] as string;
    let userRole = req.headers["x-user-role"] as string;

    const authHeader = req.headers["authorization"];
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.substring(7);
      const decoded = decodeFirebaseToken(idToken);
      if (decoded && decoded.user_id) {
        userId = decoded.user_id;
        userRole = (decoded as any).role || userRole || "student";
      }
    }

    if (!userId) {
       (req as any).aiRouting = { type: 'system' };
       return next();
    }

    try {
        const settingsDoc = await db.collection("config").doc("ai_settings").get();
        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        const trialRequests = typeof settings?.trialRequests === 'number' ? settings.trialRequests : 10;
        
        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const personalKeys = userData?.personalAiKeys || {};
        const usedTrials = typeof userData?.usedAiTrials === 'number' ? userData.usedAiTrials : 0;
        
        const isAdminOrSpecial = userRole === 'admin' || userRole === 'teacher';
        const hasTrial = usedTrials < trialRequests;
        
        const decrementTrial = async () => {
            if (!isAdminOrSpecial && hasTrial) {
                await db.collection("users").doc(userId).update({ usedAiTrials: admin.firestore.FieldValue.increment(1) }).catch(console.error);
                await db.collection("config").doc("ai_settings").set({ totalAiRequests: admin.firestore.FieldValue.increment(1), systemApiRequests: admin.firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            } else if (!isAdminOrSpecial && !hasTrial && (personalKeys.gemini || personalKeys.cerebras)) {
                await db.collection("config").doc("ai_settings").set({ totalAiRequests: admin.firestore.FieldValue.increment(1), personalApiRequests: admin.firestore.FieldValue.increment(1) }, { merge: true }).catch(console.error);
            }
        };
        
        if (isAdminOrSpecial || hasTrial) {
            (req as any).aiRouting = { type: 'system', onSuccess: decrementTrial };
        } else if (personalKeys.gemini || personalKeys.cerebras) {
            (req as any).aiRouting = { 
                type: 'personal', 
                geminiKey: personalKeys.gemini, 
                cerebrasKey: personalKeys.cerebras, 
                onSuccess: decrementTrial 
            };
        } else {
            return res.status(402).json({
                error: true,
                code: "API_SETUP_REQUIRED",
                message: "Bạn đã hết lượt dùng thử System API. Vui lòng thiết lập Personal API Key trong Cài đặt -> AI để tiếp tục."
            });
        }
        
        next();
    } catch (e) {
        console.error("AI Routing error:", e);
        (req as any).aiRouting = { type: 'system' };
        next();
    }
  };

  const executeRouted = async (req: express.Request, contents: any, config?: any) => {
      const routing = (req as any).aiRouting || { type: 'system' };
      let res;
      if (routing.type === 'personal') {
          const provider = routing.geminiKey ? 'google' : 'cerebras';
          const key = routing.geminiKey || routing.cerebrasKey;
          res = await CrossProviderRotator.executePersonal(contents, key, provider, config);
      } else {
          res = await CrossProviderRotator.execute(contents, config);
      }
      if (routing.onSuccess) await routing.onSuccess();
      return res;
  };

  const executeStreamRouted = async function* (req: express.Request, contents: any, config?: any) {
      const routing = (req as any).aiRouting || { type: 'system' };
      let stream;
      if (routing.type === 'personal') {
          const provider = routing.geminiKey ? 'google' : 'cerebras';
          const key = routing.geminiKey || routing.cerebrasKey;
          stream = CrossProviderRotator.executePersonalStream(contents, key, provider, config);
      } else {
          stream = CrossProviderRotator.executeStream(contents, config);
      }
      let successTracked = false;
      for await (const chunk of stream) {
          if (!successTracked && routing.onSuccess) {
              await routing.onSuccess();
              successTracked = true;
          }
          yield chunk;
      }
  };
`;

// Find agentUsageControlMiddleware and replace it
server = server.replace(/const agentUsageControlMiddleware.*?next\(\);\n  };\n/s, aiRoutingMiddlewareString);
server = server.replace(/const aiCooldownMiddleware.*?next\(\);\n  };\n/s, "");

server = server.replace(/agentUsageControlMiddleware/g, 'aiRoutingMiddleware');
server = server.replace(/aiCooldownMiddleware/g, 'aiRoutingMiddleware');

server = server.replace(/const checkAndUpdateAiQuota[\s\S]*?(?=app\.post)/, ""); // Better way to remove it

// Replace calls
server = server.replace(/CrossProviderRotator\.executeStream\((.*?)\)/g, 'executeStreamRouted(req, $1)');
server = server.replace(/CrossProviderRotator\.execute\((.*?)\)/g, 'executeRouted(req, $1)');

// Remove remaining references to quota
server = server.replace(/let quotaIncremented = false;/g, '');
server = server.replace(/if \(!quotaIncremented\) \{.*?quotaIncremented = true;.*?\}\n.*?\}\n/gs, '');
server = server.replace(/await incrementAgentQuota\(\(req as any\)\.agentUserId\);/g, '');

fs.writeFileSync('server.ts', server);
