(function () {
	var stream = [];
	var start = 0;

	var global = {
		channel: ["NUM", 0]
	}

	var map = {
		meta: {
			timesig: ["FF", "58", "04"],
			keysig: ["FF", "59", "02"],
			tempo: ["FF", "51", "03"]
		},
		midi: {
			program: ["Cn"],
			control: ["Bn"],
			noteon: ["9n"],
			noteoff: ["8n"]
		}
	}

	var nn = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];

	var keywords = ["START", "SET", "TO", "END", "WAIT", "PLAY", "FOR", "REST", "ADD", "WITH", "FUNC", "ENDFUNC", "CALL"]; //Add Export and Import

	function MIDIScript(data) {
		stream = [77, 84, 104, 100, 0, 0, 0, 6, 0, 1]
		start = 0;

		data += "\n";
		var toks = Lex(data);

		stream.push(0, start, 4, 0);
		//Parse(toks, global);
		stream = enter(Parse(toks,global),stream);
		return stream;
	}

	window["MIDIScript"] = MIDIScript;

	function Lex(f) {
		var tokens = [];
		var line = [];
		var tok = "";
		var strs = false;
		var str = "";
		var expr = "";
		var ls = "";
		var ms = "";
		var fl = "";
		var lss = false;
		var mss = false;
		var i = 0;
		var z;
		var com = false;
		var func = false;
		var funcf = false;

		for (; i < f.length; i++) {
			tok += f[i];

			if (f[i] == '\n') {
				if (func) {
					line.push(fl);
				} else if (expr) {
					line.push("NUM:" + expr.toString());
					expr = "";
				}
				/*else if(tok.Length > 0) {
				    line.Add("VALUE:" + tok);
				}*/
				tokens.push(line);
				line = [];
				if (func || funcf) {
					line.push("LINE:");
					func = true;
				}
				com = false;
				fl = "";
				tok = "";
			} else if (com) {} else if (c == '*') {
				com = true;
			} else if (func && tok != "ENDFUNC") {
				fl += c;
			} else if (f[i] == " ") {
				if (!strs || !lss) {
					if (tok.length > 0 && tok != " ") {
						line.push("VALUE:" + tok.trim());
					}
					tok = "";
				} else {
					tok = " ";
				}
			} else if ((f[i + 1] == " " || f[i + 1] == "\n") && keywords.includes(tok)) {
				if (tok == "START") {
					start += 1;
				} else if (tok == "FUNC") {
					funcf = true;
				} else if (tok == "ENDFUNC") {
					line.shift();
					func = false;
					funcf = false;
				}
				line.push("KEYWORD:" + tok);
				tok = "";
			} else if (tok == "{") {
				mss = true;
				tok = "";
			} else if (tok == "}") {
				line.push("MAP:(" + ms + ")");
				mss = false;
				tok = "";
			} else if (tok == "[") {
				lss = true;
				tok = "";
			} else if (tok == "]") {
				line.push("LIST:(" + ls + ")");
				ls = "";
				lss = false;
				tok = "";
			} else if (!isNaN(parseInt(tok)) && !strs && !lss) {
				expr += tok;
				tok = "";
			} else if (tok == "\"") {
				if (!strs) {
					strs = true;
				} else if (strs) {
					line.push("STRING:" + str + "\"");
					str = "";
					strs = false;
					tok = "";
				}
			} else if (strs) {
				str += tok;
				tok = "";
			} else if (lss) {
				ls += tok;
				tok = "";
			} else if (mss) {
				ms += tok;
				tok = "";
			}
		}
		midcon.log(tokens.join("\n"));
		return tokens;
	}

	function Parse(t, scope) {
		//midcon.log(stream.Length);
		var track = [];
		var mtrk = [];
		var wait = 0;
		var ind = 0;
		var indl = [];
		var il = false;
		var xl = [];
		var lx = 0;
		var curvar = "";

		t.forEach(i => {
			var j = 0;
			if (i.length > 0 && i[0] == "LINE:") {
				//scope.AddFuncLine(i.join(" ".replace("LINE: ",""));
			} else {
				while (j < i.length) {
					var s = split(i[j]);
					if (s[0] == "KEYWORD") {
						if (s[1] == "START") {
							j++;
						} else if (s[1] == "END") {
							mtrk.push(1, 255, 47);
							track.push(77, 84, 114, 107);
							track = enter([0], enter(enter(mtrk, getlen(mtrk)), track));

							//midcon.log(track);
							//midcon.log("TRACK P: " + track.Length.ToString() + " bytes");
							mtrk = [];
							j++;
						} else if (s[1] == "ADD") {
							try {
								var sv = split(i[j + 1])[1].trim();
								var mv = map[obj_split(sv)[0]][obj_split(sv)[1]];
								//mtrk.push(wait,hextodec(mv));
								mtrk = enter(enter(hextodec(mv), [wait]), mtrk);
								wait = 0;
							} catch {
								midcon.log(split(i[j + 1])[1].trim() + " is not a defined map");
							}
							j += 2;
						} else if (s[1] == "WITH") {
							var it;
							if (split(i[j + 1])[0] == "LIST") {
								try {
									it = toint(tolist(split(i[j + 1])[1]));
									mtrk = enter(it, mtrk);
									//mtrk = enter(it,mtrk);
								} catch {
									//midcon.log(toint(tolist(split(i[j+1])[1])));
									midcon.log("Error A");
								}
							}
							/*else if(scope.Exists(split(i[j+1])[1].Trim())) {
								//midcon.log(Variables.listvar[split(i[j+1])[1]]);
								it = toint(scope.listvar[split(i[j+1])[1].Trim()]);
								mtrk = enter(it,mtrk);
							}*/
							j += 2;
						} else if (s[1] == "SET") {
							try {
								curvar = split(obj_split(i[j + 1])[0])[1].trim();
							} catch {
								midcon.log("Variable name is invalid");
							}
							j += 2;
						} else if (s[1] == "TO") {
							/*if(scope.includes(curvar)) {
								try {
									scope.Set(curvar,split(i[j+1]));
								}
								catch {
									midcon.log("Error B");
								}
							}
							else {
								try {
									scope.Add(curvar,split(i[j+1]));
								}
								catch {
									midcon.log("Error J");
								}
							}*/
							//midcon.log(i);
							scope[curvar] = split(i[j + 1]);
							j += 2;
						}
						/*else if(s[1] == "FUNC") {
							scope.curfunc = split(i[j+1])[1];
							//Variables.curfuncargs = Convert.ToInt32(split(i[j+2])[1]);
							j += 3;
						}
						else if(s[1] == "ENDFUNC") {
							scope.EndFunc();
							j++;
						}
						else if(s[1] == "CALL") {
							var sxl = obj_split(split(i[j+1])[1]);

							if(sxl.Length > 1) {
								Variables mp = scope.GetMap(split(i[j+1])[1]);
								mtrk = enter(mp.Invoke(sxl[sxl.Length-1]),mtrk);
							}
							else {
								mtrk = enter(scope.Invoke(split(i[j+1])[1]),mtrk);
							}
							j += 2;
						}*/
						//else if(s[1] == "WAIT") {}
						else if (s[1] == "PLAY") {
							if (split(i[j + 1])[0] == "LIST") {
								il = true;
								mv = map["midi"];
								indl = ltoi(tolist(split(i[j + 1])[1]));
								indl.forEach(x => {
									//midcon.log(x);
									mtrk.push(wait, hextodec(mv["noteon"])[0]);
									mtrk.push(x, 90);
								});
							} else if (split(i[j + 1])[0] == "VALUE") {
								il = false;
								mv = map["midi"];
								ind = ntoi(split(i[j + 1])[1]);
								//midcon.log(split(i[j+1])[1]);
								mtrk.push(wait, hextodec(mv["noteon"])[0]);
								mtrk.push(ind, 90);
							}
							j += 2;
						} else if (s[1] == "FOR") {
							if (split(i[j + 1])[0] == "NUM") {
								if (il) {
									mtrk.push(toint([plusoety(split(i[j + 1])[1])]), 0);
									indl.forEach(x => {
										if (lx + 1 != indl.length) {
											xl = [x, 0, 0];
										} else {
											xl = [x, 0];
										}
										mtrk.push(hextodec(map["midi"]["noteon"]), xl);
										lx++;
									});
									lx = 0;
								} else {
									mtrk = enter(enter([0], toint([plusoety(split(i[j + 1])[1])])), mtrk);
									mtrk = enter(enter([ind, 0], hextodec(map["midi"]["noteon"])), mtrk);
								}
							}
							j += 2;
						} else if (s[1] == "REST") {
							if (split(i[j + 1])[0] == "NUM") {
								try {
									//midcon.log(split(i[j+1])[1]);
									mtrk = enter([parseInt(plusoety(split(i[j + 1])[1]))], mtrk);
								} catch {
									midcon.log("Error C");
								}
							}
							j += 2;
						}
						/*else if(s[1] == "IMPORT") {
							try {
								//Variables scovar = new Variables();
								string data = File.ReadAllText("C:\\Users\\Yash\\Desktop\\Other\\Code\\CSharp\\MIDI\\lib\\" + split(i[j+1])[1] + ".mids");
								data += " \n";
								//midcon.log(data);
								string[][] toke = Lex(data);
								parse(toke,vars);
							}
							catch(Exception e) {
								midcon.log(e);
								//midcon.log(split(i[j+1])[1] + "- does not exist");
							}
							j += 2;
						}
						else if(s[1] == "EXPORT") {
							try {
								//vars.Add(i[j+1],split("FUNC:" + scope.funcvar[i[j+1]]));
								vars.Add(i[j+1],split("MAP:" + scope.mapvar[i[j+1]]));
							}
							catch {
								midcon.log(String.Join(" ",i));
							}
							j += 2;
						}*/
						else {
							j++;
						}
					} else {
						j++;
					}
				}
			}
		});


		//track.push(mtrk);
		//midcon.log(track);
		return track;
	}

	function enter(bstr, arr) {
		if (bstr.length == 0) {
			return arr;
		} else {
			arr = [...arr, ...bstr]
			return arr;
		}
	}

	function split(stok) {
		return stok.split(":");
	}

	function obj_split(stok) {
		return stok.split(".");
	}

	function btoi(b) {
		try {
			return parseInt(b, 2);
		} catch {
			midcon.log("Error E");
			return 0;
		}
	}

	function getlen(b) {
		var bstring = ("00000000000000000000000000000000" + Number.prototype.toString.call(b.length + 1, 2));
		bstring = bstring.substring(bstring.length - 32);
		//midcon.log(bstring);
		return [btoi(bstring.substring(0, 8)), btoi(bstring.substring(8, 16)), btoi(bstring.substring(16, 24)), btoi(bstring.substring(24))];
	}

	function hextodec(h) {
		var ret = [];
		h.forEach(x => {
			try {
				//ret = enter(new int[] {Convert.ToInt32(x.Replace("n",global["channel"].toString()),16)},ret);
				ret.push(parseInt(x.replace("n", global["channel"][1].toString()), 16));
				//midcon.log(x.replace("n",global["channel"]));
			} catch {
				midcon.log("Error F");
			}
		});
		return ret;
	}

	function tolist(s) {
		s = s.replace("(", "").replace(")", "");
		return s.split(",");
	}

	function toint(a) {
		ret = [];
		a.forEach(x => {
			try {
				ret.push(parseInt(x));
			} catch {
				midcon.log("Error I");
			}
		});
		return ret;
	}

	function ltoi(l) {
		var r = [];
		l.forEach(n => {
			try {
				n = n.trim();
				var o = parseInt(n[n.length - 1].toString()) + 1;
				var no = n.substring(0, n.length - 1);
				r.push(o * 12 + (nn.indexOf(no)));
			} catch {
				midcon.log("Error G");
				//break;
			}
		});
		return r;
	}

	function ntoi(n) {
		try {
			n = n.trim();
			var o = parseInt(n[n.length - 1].toString()) + 1;
			var no = n.substring(0, n.length - 1);
			//Console.WriteLine(no);
			return o * 12 + (nn.indexOf(no));
		} catch {
			midcon.log("Error H");
			return 0;
		}
	}

	function plusoety(s) {
		var n = parseInt(s);
		return (n + 128).toString();
	}
})();
