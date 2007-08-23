// lambda - a lambda calulator which operates on the HTML-DOM

var lambda =
function ()
{
	// conjoined test for all expression types
	this.expression_p =
	function (node)
	{
		return (node && this.element_p(node) && (this.var_p(node) || this.abstraction_p(node) || this.application_p(node))) ? true : false;
	}

	this.expression_to_string =
	function (exp)
	{
		var x = "";

		if(this.var_p(exp))
		{
			x = x + " " + exp.textContent;
		}
		else if(this.abstraction_p(exp))
		{
			x = x + "(L " + this.abstraction_term(exp).textContent + "." + this.expression_to_string(this.abstraction_body(exp)) + ")";
		}
		else if(this.application_p(exp))
		{
			x = x + "(" + this.expression_to_string(this.application_rator(exp)) + " " + this.expression_to_string(this.application_rand(exp)) + ")";
		}

		return x;
	}

	// allows us to ignore "White Space"
	this.element_p =
	function (node)
	{
		return (node.nodeType == 1) ? true : false;
	}

	// tokens are only what returns true for element_p
	// I tried doing this by iterating over the childNodes list
	// but it actually increased the runtime
	this.first_element_token =
	function (node)
	{
		var first_token = node.firstChild;

		// inline element_p() call here to avoid a context switch...
		while(first_token && first_token.nodeType != 1)
		{
			first_token = first_token.nextSibling;
		}

		return first_token;
	}

	// pass the result of first_element_token here to get the next
	// token
	this.next_element_token =
	function (node)
	{
		var next_token = node.nextSibling;

		while(next_token && !this.element_p(next_token))
		{
			next_token = next_token.nextSibling;
		}

		return next_token;
	}

	// variable predicate
	this.var_p =
	function (node)
	{
		return node.tagName === "VAR" ? true : false;
	}

	// two variables are the same if they have the same name
	this.same_var_p =
	function (x,y)
	{
		return (this.var_p(x) && this.var_p(y) && (x.textContent === y.textContent)) ? true : false;
	}

	// renames variable with a prime
	this.prime_rewrite_var =
	function (x)
	{
		if(!this.var_p)
		{
			return false;
		}

		x.textContent = x.textContent + "\u2032";
		return true;
	}

	// returns a new copy of the expanded var from the environment
	this.expand_var =
	function (v,environment)
	{
		var expansion = this.expand_var_p(v,environment);

		if(expansion)
		{
			return this.first_element_token(expansion).cloneNode(true);
		}

		return v;
	}

	this.expand_var_p =
	function (v, environment)
	{
		return environment.getElementById(v.textContent);
	}

	// lambda abstraction (function definition) predicate
	this.abstraction_p =
	function (node)
	{
		var has_term = false, 
				has_body = false;

		if(node.tagName === "DL")
		{
			var inner_node = this.first_element_token(node);

			if(inner_node.tagName === "DT")
			{
				var lambda = this.first_element_token(inner_node);
				has_term = this.var_p(lambda);
			}

			inner_node = this.next_element_token(inner_node);
			
			if(inner_node.tagName === "DD")
			{
				var M = this.first_element_token(inner_node);
				has_body = this.expression_p(M);
			}
		}
		return (has_term && has_body) ? true : false;
	}

	// accessor for the term of the expression
	// \x. body <-- x is the term
	this.abstraction_term =
	function (node)
	{
		return this.first_element_token(this.first_element_token(node));
	}

	// accessor fot the body of the expression
	// \x. body <-- body is the body
	this.abstraction_body =
	function (node)
	{
		return this.first_element_token(this.next_element_token(this.first_element_token(node)));
	}

	// return a new abstraction from the DOM
	this.new_abstraction =
	function (v,E)
	{
		var abx = document.createElement("DL"),
				term = document.createElement("DT"),
				body = document.createElement("DD");

		abx.appendChild(term);
		abx.appendChild(body);

		term.appendChild(v);
		body.appendChild(E);

		return abx;
	}

	// lambda application (function application) predicate
	this.application_p =
	function (node)
	{
		var has_e1 = false,
				has_e2 = false;

		if(node.tagName === "OL")
		{
			var inner_node = this.first_element_token(node);

			if(inner_node.tagName === "LI")
			{
				var M = this.first_element_token(inner_node);
				has_e1 = this.expression_p(M);
			}

			inner_node = this.next_element_token(inner_node);

			if(inner_node.tagName === "LI")
			{
				var N = this.first_element_token(inner_node);
				has_e2 = this.expression_p(N);
			}
		}
		return (has_e1 && has_e2) ? true : false;
	}

	// please check that node passes application_p first
	// (perhaps left-hand-side and right-hand-side are better names, but too long!)
	this.application_rator =
	function (node)
	{
		return this.first_element_token(this.first_element_token(node));
	}

	// this one too
	this.application_rand =
	function (node)
	{
		return this.first_element_token(this.next_element_token(this.first_element_token(node)));
	}

	// construct a new application from the DOM
	this.new_application =
	function (rator,rand)
	{
		var app = document.createElement("OL"),
				N = document.createElement("LI"),
				M = document.createElement("LI");

		app.appendChild(N);
		app.appendChild(M);
		N.appendChild(rator);
		M.appendChild(rand);

		return app;
	}

	this.tree_map =
	function (node, func)
	{
		func(node);
		node = node.firstChild;
		while (node)
		{
			this.tree_map(node,func);
			node = node.nextSibling;
		}
	}

	this.substitute_term_in_expression =
	function (term,expression,to)
	{
		var lambda = this;	
		this.tree_map(expression, function (node)
		{
			if(lambda.var_p(node) && lambda.same_var_p(term,node))
			{
				if(node.parentNode)
				{
					node.parentNode.replaceChild(to.cloneNode(true),node);
				}
				else
				{
					while(node.childNodes.length)
					{
						node.removeChild(node.firstChild);
					}
					for(var c = 0; c < to.childNodes.length; c++)
					{
						node.appendChild(to.childNodes[c].cloneNode(true));
					}
				}
			}
		});
	}

	// test is variable x occurs free in expression
	this.occurs_free =
	function (expression,x)
	{
		if(!this.var_p(x))
		{
			return false;
		}

		if(this.var_p(expression))
		{
			return this.same_var_p(expression,x) ? true : false;
		}
		else if(this.application_p(expression))
		{
			return (this.occurs_free(this.application_rator(expression),x) || this.occurs_free(this.application_rand(expression),x)) ? true : false;
		}
		else if(this.abstraction_p(expression))
		{
			return (!this.same_var_p(this.abstraction_term(expression),x) && this.occurs_free(this.abstraction_body(expression),x)) ? true : false;
		}
		return false;
	}

	// return the set of free variables in the expresion
	this.FV =
	function (expression)
	{
		var free_set = {};

		if(this.var_p(expression))
		{
			free_set[expression.textContent] = 1;
		}
		else if(this.abstraction_p(expression))
		{
			free_set = this.FV(this.abstraction_body(expression));
			delete free_set[this.abstraction_term(expression).textContent];		
		}
		else if(this.application_p(expression))
		{
			var fv_e1 = this.FV(this.application_rator(expression)),
					fv_e2 = this.FV(this.application_rand(expression));

			for(var v in fv_e1) { free_set[v] = 1; }
			for(var v in fv_e2) { free_set[v] = 1; }
		}
		return free_set;
	}

	// test if variable x is bound in expression
	this.occurs_bound =
	function (expression,x)
	{
		if(!this.var_p(x))
		{
			return false;
		}

		if(this.var_p(expression))
		{
			// console.log("No variable occurs bound in an expression consisting of a single variable or constant.");
			return false;
		}

		if(this.application_p(expression))
		{
			return (this.occurs_bound(this.application_rator(expression),x) || this.occurs_bound(this.application_rand(expression),x)) ? true : false;
		}
		else if(this.abstraction_p(expression))
		{
			return (this.same_var_p(this.abstraction_term(expression),x) || this.occurs_bound(this.abstraction_body(expression),x)) ? true : false;
		}
		return false;
	}

	// returns true if the expression can be reduced
	this.has_beta_redex_p =
	function (expression,environment)
	{
		if(this.application_p(expression))
		{
			var rator = this.application_rator(expression),
					rand  = this.application_rand(expression);

			if(this.abstraction_p(rator) || this.expand_var_p(rator,environment))
			{
				return true;
			}

			return (this.has_beta_redex_p(rator,environment) || this.has_beta_redex_p(rand,environment));
		}
		else if(this.abstraction_p(expression))
		{
			return this.has_beta_redex_p(this.abstraction_body(expression),environment);
		}
		return false;
	}

	// returns reference to the first redex in expression under normal-order terms
	this.normal_order_redex =
	function (expression,environment)
	{
		if(this.application_p(expression))
		{
			var rator = this.application_rator(expression),
					rand  = this.application_rand(expression);

			if(this.abstraction_p(rator) || this.expand_var_p(rator,environment))
			{
				return expression;
			}

			return (this.normal_order_redex(rator,environment) || this.normal_order_redex(rand,environment))
		}
		else if(this.abstraction_p(expression))
		{
			return this.normal_order_redex(this.abstraction_body(expression),environment);
		}
		return null;
	}

	// alpha-conversion: \x . x -> \y . y
	this.alpha_convert =
	function (expression,from,to)
	{
		if(this.same_var_p(expression,from))
		{
			// no need to replace, just swap content
			expression.textContent = to.textContent;
		}
		else if(this.abstraction_p(expression))
		{
			var term = this.abstraction_term(expression);
			if(this.same_var_p(term,from))
			{
				term.textContent = to.textContent;
				this.alpha_convert(this.abstraction_body(expression),from,to);
			}
		}
		else if(this.application_p(expression))
		{
			this.alpha_convert(this.application_rator(expression),from,to);
			this.alpha_convert(this.application_rand(expression),from,to);
		}
	}

	// eta-reduction: \x. E x -> E <-> FV(E) \ {x}
	this.eta_reduce =
	function (expression,environment)
	{
		if(this.abstraction_p(expression))
		{
			var term = this.application_rator(expression),
					body  = this.application_rand(expression);

			if(this.application_p(body))
			{
				var rator = this.application_rator(body),
						rand  = this.application_rand(body),
						free_vars = this.FV(rator);
				if(this.same_var_p(term,rand) && !(rand.textContent in free_vars))
				{
					expression.parentNode.replaceChild(rator,expression);
					return true;
				}
			}
		}
		return false;
	}

	this.beta_reduce =
	function (redex,environment)
	{
		var rator = this.application_rator(redex),
				rand  = this.application_rand(redex);

		if(!this.abstraction_p(rator)) //{ return null; }
		{
			var new_rator = this.expand_var(rator,environment);
			if(new_rator !== rator)
			{
				rator.parentNode.replaceChild(new_rator.cloneNode(true),rator);
			}
			return false;
		}

		var term = this.abstraction_term(rator),
				body = this.abstraction_body(rator),
				lambda = this,
				substitution = function (E, v, M)
				{
					if(lambda.var_p(E))
					{
						if(lambda.same_var_p(E,v))
						{
							return M.cloneNode(true);
						}
						else
						{
							return E.cloneNode(true);
						}
					}
					else if(lambda.application_p(E))
					{
						return lambda.new_application(substitution(lambda.application_rator(E),v,M),substitution(lambda.application_rand(E),v,M));
					}
					else if(lambda.abstraction_p(E))
					{
						var x = lambda.abstraction_term(E),
								e = lambda.abstraction_body(E),
						    FV_e = lambda.FV(e);

						if(!(v.textContent in FV_e))
						{
							return E;
						}
						else if(! lambda.same_var_p(v,x))
						{
							var FV_M = lambda.FV(M);

							if(!(x.textContent in FV_M))
							{
								return lambda.new_abstraction(x,substitution(e,v,M));
							}
							else
							{
								var z = x.cloneNode(true);   // z == v
								while(lambda.same_var_p(z,x) || (z.textContent in FV_e || z.textContent in FV_M))
								{
									lambda.prime_rewrite_var(z);
								}
								// z != v ^ z not in FV(E E1)
								lambda.alpha_convert(E,x.cloneNode(true),z);
								return lambda.new_abstraction(z,substitution(e,v,M));
							}
						}
					}
				};

			redex.parentNode.replaceChild(substitution(body,term,rand),redex);
			return true;
	}

	// apply lambda reduction rules to the redex
	// and return the new expression
	this.reduce =
	function (redex,environment)
	{
		if(redex)
		{
			var rator = this.application_rator(redex),
					rand  = this.application_rand(redex);

			// 1. before doing a substitution see if we can eta-reduce the rator
			//    If we can return the reduced rator to the caller
			this.eta_reduce(rator,environment) ||	this.beta_reduce(redex,environment);
		}
	}

	// iterates over the element_tokens in the toplevel, reducing expressions
	this.compute_toplevel =
	function (toplevel)
	{
		var token = this.first_element_token(toplevel);
		while(token)
		{
			// find an element we can reduce on
			while(token && !this.has_beta_redex_p(token,document))
			{
				token = this.next_element_token(token);
			}

			// search failed, we're done
			if(!token)
			{
				break;
			}

			this.reduce(this.normal_order_redex(token,document),document);

			// if we lost our initial node, grab the first one
			if(!token || !token.parentNode)
			{
				token = this.first_element_token(toplevel);
			}
		}
	}

};

var prelude = new lambda();
