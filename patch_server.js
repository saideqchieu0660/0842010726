const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// We will replace `const agentUsageControlMiddleware = ...` and `const aiCooldownMiddleware = ...`
// with `const aiRoutingMiddleware = ...`
// Actually, it's easier to just overwrite them.

const aiRoutingMiddlewareString = `
  const aiRoutingMiddleware = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let userId = req.headers["x-user-id"] as string;
    let userRole = req.headers["x-user-role"] as string;
    let isPro = req.headers["x-user-is-pro"] === "true";

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
       // Allow anonymous but map to system
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
        // Fail-safe to system
        (req as any).aiRouting = { type: 'system' };
        next();
    }
  };
`;

// Replace usages
server = server.replace(/const agentUsageControlMiddleware.*?next\(\);\n  };\n/s, aiRoutingMiddlewareString);
server = server.replace(/const aiCooldownMiddleware.*?next\(\);\n  };\n/s, "");

server = server.replace(/agentUsageControlMiddleware/g, 'aiRoutingMiddleware');
server = server.replace(/aiCooldownMiddleware/g, 'aiRoutingMiddleware');

// Remove old AI quota functions
server = server.replace(/const checkAndUpdateAiQuota.*?\n  };\n/s, "");
server = server.replace(/const incrementAgentQuota.*?\n  };\n/s, "");
server = server.replace(/const getAgentQuotaInfo.*?\n  };\n/s, "");

// Replace CrossProviderRotator calls to handle personal routing
// For executeStream:
const streamRegex = /const stream = CrossProviderRotator\.executeStream\((.*?)\);/g;
server = server.replace(streamRegex, (match, p1) => {
    return \`
    const routing = (req as any).aiRouting;
    let stream;
    if (routing?.type === 'personal') {
        const provider = routing.geminiKey ? 'google' : 'cerebras';
        const key = routing.geminiKey || routing.cerebrasKey;
        stream = CrossProviderRotator.executePersonalStream(\${p1.split(',')[0]}, key, provider, \${p1.split(',').slice(1).join(',') || '{}'});
    } else {
        stream = CrossProviderRotator.executeStream(\${p1});
    }
    \`;
});

// Need a smarter replace for other executes... I will do this with another node script or sed since regex matching nested brackets is hard.
fs.writeFileSync('server.ts', server);
